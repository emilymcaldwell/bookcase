"use strict";

/* ============================================================
   Bookcase — all behaviour.

   Every change follows the same path:
     event → change state → persist() → renderAll()
   ============================================================ */

/* ------------------------------------------------------------
   The four statuses, declared once. Every label, colour and
   ordering decision derives from this array. `rank` is the
   status-sort order; `dim` marks the finished states whose list
   titles render de-emphasised.
   ------------------------------------------------------------ */
const STATUSES = [
  { key: "tbr",     short: "TBR", label: "To Be Read",        rank: 1 },
  { key: "reading", short: "CR",  label: "Currently Reading", rank: 0 },
  { key: "read",    short: "FIN", label: "Read",              rank: 2, dim: true },
  { key: "dropped", short: "DNF", label: "Did Not Finish",    rank: 3, dim: true },
];
const STATUS_BY_KEY = Object.fromEntries(STATUSES.map((s) => [s.key, s]));

/* Text comparison is case- and accent-insensitive everywhere. */
const cmpText = (a, b) => a.localeCompare(b, undefined, { sensitivity: "base" });

/* Date order is newest first; books with no date sink to the bottom
   regardless of direction, and two undated books fall back to title.
   Reads the RAW readDate, not the status-masked one, so a legacy date
   still orders the book even though the list does not show it. */
function cmpDate(a, b) {
  if (a.readDate && b.readDate) {
    if (a.readDate !== b.readDate) return a.readDate < b.readDate ? 1 : -1;
    return cmpText(a.title, b.title);
  }
  if (a.readDate) return -1;
  if (b.readDate) return 1;
  return cmpText(a.title, b.title);
}

/* The sort orders, declared once — this array drives both the menu
   and the comparators. `manual` is the array's own order. */
const SORTS = [
  { key: "manual", label: "Unsorted",  cmp: null },
  { key: "status", label: "Status",    cmp: (a, b) => STATUS_BY_KEY[a.status].rank - STATUS_BY_KEY[b.status].rank || cmpDate(a, b) },
  { key: "title",  label: "Title",     cmp: (a, b) => cmpText(a.title, b.title) },
  { key: "author", label: "Author",    cmp: (a, b) => cmpText(a.author, b.author) || cmpText(a.title, b.title) },
  { key: "date",   label: "Date Read", cmp: cmpDate },
];
const SORT_KEYS = SORTS.map((s) => s.key);

const API = "https://api.github.com/gists/";
const KEYS = {
  books: "bookcase.books",
  settings: "bookcase.settings",
  sync: "bookcase.sync",
  prefs: "bookcase.prefs",
};

/* ------------------------------------------------------------
   State — three top-level objects, kept separate.
   ------------------------------------------------------------ */
let books = [];   // the library — persisted

let ui = {        // this tab, this moment — never persisted
  filter: "all",  // "all" | "fave" | a status key
  query: "",      // the search box
  sort: "manual", // persisted separately, in prefs
  selected: null, // id of the book whose detail is open
  busy: false,    // a network call is in flight
  msg: "",        // "" | "err" | "conflict"
  editing: null,  // id being edited, or null for a new book
  // tab-local chrome state, same lifetime as the rest of ui:
  msgText: "",    // the reason behind msg === "err"
  sheet: null,    // null | "form" | "backup" | "settings" | "conflict"
  menu: null,     // null | "sort" | "detail"
  searching: false, // phone search row revealed
  formStatus: STATUSES[0].key, // the form's draft status, until Save
  settingsMsg: null,           // { cls, text } under the settings form
};

let sync = {      // persisted — dirty MUST survive a closed tab
  dirty: false,   // there are edits the gist has not seen
  version: null,  // the gist version marker last seen
  pushedAt: null, // when this device last pushed
  cloudAt: null,  // when the gist was last written, by anyone
  touched: [],    // ids edited since the last push
};

let settings = { gistId: null, token: null };

/* What the conflicting cloud copy looked like when the conflict was
   detected — feeds the comparison block in the dialog. */
let conflictInfo = null; // { cloudAt, cloudCount }

/* ------------------------------------------------------------
   Storage — every read tolerates absent or corrupt values.
   ------------------------------------------------------------ */
function load(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    if (raw === null) return fallback;
    const val = JSON.parse(raw);
    return val === null || val === undefined ? fallback : val;
  } catch {
    return fallback;
  }
}
function store(key, val) {
  try { localStorage.setItem(key, JSON.stringify(val)); } catch { /* full or blocked — nothing to do */ }
}

function persist() {
  store(KEYS.books, books);
  store(KEYS.sync, sync);
  store(KEYS.prefs, { sort: ui.sort });
}
function saveSettings() {
  store(KEYS.settings, settings);
}

function isConnected() {
  return Boolean(settings.gistId && settings.token);
}

/* Every edit funnels through here. Unsaved tracking only applies when
   a gist is configured — with no gist there is nothing to be out of
   date with. */
function commit(id) {
  if (isConnected()) {
    sync.dirty = true;
    if (id && !sync.touched.includes(id)) sync.touched.push(id);
  }
  persist();
  renderAll();
}

/* ------------------------------------------------------------
   Normalising what comes in: structural repair is allowed and
   expected; discarding a value the owner may have meant is not.
   A stray readDate on a not-read book survives in storage and is
   masked at display time only.
   ------------------------------------------------------------ */
const usedIds = new Set();
function genId() {
  let id;
  do { id = Math.random().toString(36).slice(2, 8); } while (usedIds.has(id) || id.length < 6);
  usedIds.add(id);
  return id;
}

function normalise(raw) {
  const b = raw && typeof raw === "object" ? raw : {};
  const id = typeof b.id === "string" && b.id ? b.id : genId();
  usedIds.add(id);
  return {
    id,
    status: STATUS_BY_KEY[b.status] ? b.status : "tbr",
    title: typeof b.title === "string" ? b.title : "",
    author: typeof b.author === "string" ? b.author : "",
    readDate: typeof b.readDate === "string" && b.readDate ? b.readDate : null,
    fave: Boolean(b.fave),
    notes: typeof b.notes === "string" ? b.notes : "",
  };
}

/* All date display goes through this mask: the date shows only when
   the status permits it. The stored value is never touched. */
function displayDate(book) {
  return book.status === "read" ? book.readDate : null;
}

/* ------------------------------------------------------------
   The sync state ladder — one derivation, first match wins,
   and every piece of sync chrome reads from it.
   ------------------------------------------------------------ */
function syncState() {
  if (!isConnected()) return "off";
  if (ui.busy) return "busy";
  if (ui.msg === "conflict") return "conflict";
  if (ui.msg === "err") return "err";
  if (sync.dirty) return "unsaved";
  return "ok";
}
const SYNC_LABELS = {
  off: "Not connected",
  busy: "Saving…",
  conflict: "Cloud is newer",
  err: "Failed",
  unsaved: "Unsaved",
  ok: "Saved",
};
/* the save bar and the cloud badge appear for these three, not for
   unsaved alone — an error must stay on screen */
const ATTENTION = ["unsaved", "err", "conflict"];

/* ------------------------------------------------------------
   Formatting — written by hand so the output never varies by machine.
   ------------------------------------------------------------ */
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

function ordinal(n) {
  const tens = n % 100;
  if (tens >= 11 && tens <= 13) return "th";
  const one = n % 10;
  return one === 1 ? "st" : one === 2 ? "nd" : one === 3 ? "rd" : "th";
}

function fmtDate(iso) { // "2026-07-14" → "Jul 14th, 2026"
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso || "");
  if (!m) return iso || "";
  const y = Number(m[1]), mo = Number(m[2]), d = Number(m[3]);
  if (!MONTHS[mo - 1]) return iso;
  return `${MONTHS[mo - 1]} ${d}${ordinal(d)}, ${y}`;
}

function fmtStamp(when) { // → "Aug 23rd, 3:07 pm"
  const d = new Date(when);
  if (isNaN(d)) return "";
  let h = d.getHours();
  const half = h < 12 ? "am" : "pm";
  h = h % 12 || 12;
  const min = String(d.getMinutes()).padStart(2, "0");
  return `${MONTHS[d.getMonth()]} ${d.getDate()}${ordinal(d.getDate())}, ${h}:${min} ${half}`;
}

function plural(n, noun) {
  return `${n} ${noun}${n === 1 ? "" : "s"}`;
}

function relTime(ts) {
  if (!ts) return "never";
  const s = Math.floor((Date.now() - new Date(ts).getTime()) / 1000);
  if (s < 60) return "just now";
  const m = Math.floor(s / 60);
  if (m < 60) return `${plural(m, "minute")} ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${plural(h, "hour")} ago`;
  return `${plural(Math.floor(h / 24), "day")} ago`;
}

function todayStr() {
  const d = new Date();
  const p = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

/* Every piece of owner text passes through here before innerHTML. */
function esc(s) {
  return String(s)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

/* ------------------------------------------------------------
   DOM handles + shared fragments
   ------------------------------------------------------------ */
const $ = (id) => document.getElementById(id);
const el = {
  app: $("app"), chips: $("chips"), list: $("list"), detail: $("detail"),
  search: $("search"), sortbtn: $("sortbtn"), sortbadge: $("sortbadge"),
  cloudbadge: $("cloudbadge"), savebar: $("savebar"), savebarDot: $("savebar-dot"),
  savebarTitle: $("savebar-title"), savebarSub: $("savebar-sub"), scrim: $("scrim"),
  sheetForm: $("sheet-form"), formHeading: $("form-heading"),
  fTitle: $("f-title"), fAuthor: $("f-author"), fStatus: $("f-status"),
  fDatewrap: $("f-datewrap"), fDate: $("f-date"), fFave: $("f-fave"),
  fNoteadd: $("f-noteadd"), fNoteswrap: $("f-noteswrap"), fNotes: $("f-notes"),
  sheetBackup: $("sheet-backup"), backupStatus: $("backup-status"),
  backupPush: $("backup-push"), backupPullbtn: $("backup-pullbtn"),
  backupPullwarn: $("backup-pullwarn"), backupConn: $("backup-conn"),
  backupGist: $("backup-gist"), backupMsg: $("backup-msg"),
  sheetSettings: $("sheet-settings"), sGist: $("s-gist"), sToken: $("s-token"),
  sConnect: $("s-connect"), sDisconnect: $("s-disconnect"), settingsMsg: $("settings-msg"),
  sheetConflict: $("sheet-conflict"), conflictBody: $("conflict-body"),
  conflictCompare: $("conflict-compare"), conflictPullcost: $("conflict-pullcost"),
  sortmenu: $("sortmenu"), menu: $("menu"),
};

const HEART_SVG = '<svg viewBox="0 0 24 24"><path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1-1.1a5.5 5.5 0 0 0-7.8 7.8l1 1.1L12 21.2l7.8-7.7 1-1.1a5.5 5.5 0 0 0 0-7.8z"></path></svg>';
const TICK_SVG = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 12.5l5 5L20 6.5"></path></svg>';

function byId(id) {
  return books.find((b) => b.id === id) || null;
}
function titleOf(b) {
  return b.title || "Untitled";
}

/* ------------------------------------------------------------
   Rendering — each function rebuilds its region from state.
   ------------------------------------------------------------ */
function renderAll() {
  renderFilters();
  renderList();
  renderDetail();
  renderSync();
  renderSortMenu();
  renderChrome();
}

/* Counts are of the whole library and ignore the search box —
   they describe what exists, not what is on screen. */
function renderFilters() {
  const chip = (filter, inner, count) =>
    `<button class="chip" data-act="filter" data-filter="${filter}" aria-pressed="${ui.filter === filter}">${inner}<span class="n">${count}</span></button>`;
  const parts = [chip("all", "All", books.length)];
  for (const s of STATUSES) {
    parts.push(chip(s.key, esc(s.label), books.filter((b) => b.status === s.key).length));
  }
  parts.push('<span class="nav-div"></span>');
  parts.push(chip("fave", `<span class="heart">${HEART_SVG}</span>Favourites`, books.filter((b) => b.fave).length));
  el.chips.innerHTML = parts.join("");
}

function visibleBooks() {
  const q = ui.query.trim().toLowerCase();
  let list = books.filter((b) => {
    if (ui.filter === "fave" && !b.fave) return false;
    if (ui.filter !== "all" && ui.filter !== "fave" && b.status !== ui.filter) return false;
    if (q && !b.title.toLowerCase().includes(q) && !b.author.toLowerCase().includes(q)) return false;
    return true;
  });
  const order = SORTS.find((s) => s.key === ui.sort);
  if (order && order.cmp) list = [...list].sort(order.cmp);
  return list;
}

function emptyStateHtml() {
  if (books.length === 0) {
    return '<div class="empty"><strong>No books yet</strong>Add your first book with the add button.</div>';
  }
  // give the reason, first that applies: search, then favourites, then status
  let line;
  if (ui.query.trim()) line = `Nothing matches “${esc(ui.query.trim())}”.`;
  else if (ui.filter === "fave") line = "Nothing is marked as a favourite yet.";
  else line = "No books with that status yet.";
  return `<div class="empty"><strong>No books to show</strong>${line}</div>`;
}

function renderList() {
  const list = visibleBooks();
  if (!list.length) {
    el.list.innerHTML = emptyStateHtml();
    return;
  }
  el.list.innerHTML = list.map((b) => {
    const s = STATUS_BY_KEY[b.status];
    const d = displayDate(b);
    const meta = [esc(b.author), d ? fmtDate(d) : null].filter(Boolean).join(" · ");
    const touched = sync.touched.includes(b.id);
    return `<button class="row${s.dim ? " done" : ""}${b.id === ui.selected ? " selected" : ""}" data-act="open" data-id="${b.id}">` +
      `<span class="pill ${s.key}"><span class="pdot"></span>${s.short}</span>` +
      `<span class="row-main"><span class="row-title">${esc(titleOf(b))}</span><span class="row-meta">${meta}</span></span>` +
      `<span class="row-author">${esc(b.author)}</span>` +
      `<span class="row-date${d ? "" : " none"}">${d ? fmtDate(d) : "—"}</span>` +
      `<span class="row-edited${touched ? " on" : ""}"></span>` +
      `<span class="row-heart">${b.fave ? `<span class="heart">${HEART_SVG}</span>` : ""}</span>` +
      `</button>`;
  }).join("");
}

function pickerHtml(act, current) {
  return STATUSES.map((s) =>
    `<button type="button" class="choice" data-act="${act}" data-status="${s.key}" aria-pressed="${current === s.key}"><span class="sdot-lg ${s.key}"></span>${esc(s.label)}</button>`
  ).join("");
}

function renderDetail() {
  const b = byId(ui.selected);
  el.app.classList.toggle("has-detail", Boolean(b));
  if (!b) {
    el.detail.innerHTML = "";
    return;
  }
  const d = displayDate(b);
  const notes = b.notes
    ? `<div class="notes-box">${esc(b.notes)}</div>`
    : '<div class="notes-box empty-note">No notes yet.</div>';
  el.detail.innerHTML =
    '<div class="detail-top">' +
      '<button class="iconbtn btn-back" data-act="close-detail" aria-label="Back"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><path d="M15 5l-7 7 7 7"></path></svg></button>' +
      '<span class="grow"></span>' +
      '<button class="iconbtn" data-act="menu" aria-label="More actions" aria-haspopup="menu"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="12" cy="5" r="1"></circle><circle cx="12" cy="12" r="1"></circle><circle cx="12" cy="19" r="1"></circle></svg></button>' +
      '<button class="iconbtn btn-close-pane" data-act="close-detail" aria-label="Close"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><path d="M6 6l12 12M18 6L6 18"></path></svg></button>' +
    '</div>' +
    '<div class="detail-body">' +
      '<div class="detail-head">' +
        `<div class="detail-title"><h2>${esc(titleOf(b))}</h2><p>${esc(b.author)}</p></div>` +
        (b.fave ? `<span class="detail-heart heart">${HEART_SVG}</span>` : "") +
      '</div>' +
      '<div class="detail-block"><div class="section-label">STATUS</div>' +
        `<div class="picker">${pickerHtml("detail-status", b.status)}</div>` +
      '</div>' +
      '<div class="detail-line">' +
        '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><rect x="3.5" y="5" width="17" height="15" rx="2"></rect><path d="M3.5 10h17M8 3v4M16 3v4"></path></svg>' +
        '<span class="grow">Date Read</span>' +
        `<span>${d ? fmtDate(d) : "Not set"}</span>` +
      '</div>' +
      `<div class="detail-block"><div class="section-label">NOTES</div>${notes}</div>` +
    '</div>';
}

function renderSortMenu() {
  el.sortmenu.innerHTML = SORTS.map((s) =>
    `<button data-act="sort" data-sort="${s.key}" role="menuitemradio" aria-checked="${ui.sort === s.key}"><span class="menu-check">${ui.sort === s.key ? TICK_SVG : ""}</span>${esc(s.label)}</button>`
  ).join("");
  el.sortbadge.classList.toggle("hidden", ui.sort === "manual");
}

function renderSync() {
  const st = syncState();
  const attention = ATTENTION.includes(st);

  // cloud badge on the top-bar button
  el.cloudbadge.className = attention ? `btn-badge ${st}` : "btn-badge hidden";

  // save bar (phone) — the heading changes with the state
  el.savebar.classList.toggle("on", attention);
  el.app.classList.toggle("dirty", attention);
  el.savebarDot.className = `sdot ${st}`;
  el.savebarTitle.textContent =
    st === "err" ? "Save failed" :
    st === "conflict" ? "Cloud has newer changes" : "Unsaved changes";
  el.savebarSub.textContent = sync.pushedAt
    ? `Last saved to cloud ${relTime(sync.pushedAt)}`
    : "Never saved to cloud";

  // backup sheet
  const lines = [];
  if (st === "off") {
    lines.push("Backups are off. Connect a gist to sync between devices.");
  } else if (st === "err") {
    lines.push(esc(ui.msgText || "The last request failed."));
  } else if (st === "conflict") {
    lines.push("Another device has saved changes this device has never seen.");
  } else {
    lines.push(`You last saved to cloud ${relTime(sync.pushedAt)}`);
    if (sync.cloudAt) lines.push(`Cloud copy ${fmtStamp(sync.cloudAt)}`);
  }
  el.backupStatus.className = `status-card${st === "ok" || st === "off" ? " quiet" : ""}`;
  el.backupStatus.innerHTML =
    `<span class="sdot ${st}"></span><span class="grow"><b>${SYNC_LABELS[st]}</b>` +
    lines.map((l) => `<span>${l}</span>`).join("") + "</span>";

  const locked = st === "off" || ui.busy;
  el.backupPush.disabled = locked;
  el.backupPullbtn.disabled = locked;
  el.backupPullwarn.className = sync.dirty ? "caption warn" : "caption";
  el.backupPullwarn.textContent = sync.dirty
    ? "Replaces everything on this device, including your unsaved changes."
    : "Replaces everything on this device.";
  el.backupConn.textContent = isConnected() ? "Connected" : "Not connected";
  el.backupGist.innerHTML = isConnected() ? `gist <span class="mono">${esc(settings.gistId)}</span>` : "Set up cloud sync";
  el.backupMsg.className = st === "err" ? "msg err" : "msg";
  el.backupMsg.textContent = st === "err" ? (ui.msgText || "The last request failed.") : "";

  // settings sheet chrome (never touches the inputs while open)
  el.sConnect.textContent = isConnected() ? "Reconnect" : "Connect";
  el.sConnect.disabled = ui.busy;
  el.sDisconnect.classList.toggle("hidden", !isConnected());
  el.settingsMsg.className = ui.settingsMsg ? `msg ${ui.settingsMsg.cls}` : "msg";
  el.settingsMsg.textContent = ui.settingsMsg ? ui.settingsMsg.text : "";

  // conflict dialog
  if (conflictInfo) {
    el.conflictBody.textContent =
      `Another device saved to this gist on ${fmtStamp(conflictInfo.cloudAt)}. ` +
      "It holds changes this device has never seen, and saving now would write over them.";
    el.conflictCompare.innerHTML =
      `<div><span class="k">THIS DEVICE</span><span class="v">${plural(books.length, "book")}</span><span class="s">${sync.dirty ? "Unsaved changes" : "No unsaved changes"}</span></div>` +
      `<div><span class="k">CLOUD</span><span class="v">${plural(conflictInfo.cloudCount, "book")}</span><span class="s">Saved ${fmtStamp(conflictInfo.cloudAt)}</span></div>`;
    el.conflictPullcost.textContent = sync.dirty
      ? "Discards your unsaved changes"
      : "Replaces this device's copy";
  }
}

/* sheet, scrim, menu and search visibility */
function renderChrome() {
  el.sheetForm.classList.toggle("on", ui.sheet === "form");
  el.sheetBackup.classList.toggle("on", ui.sheet === "backup");
  el.sheetSettings.classList.toggle("on", ui.sheet === "settings");
  el.sheetConflict.classList.toggle("on", ui.sheet === "conflict");
  el.scrim.classList.toggle("on", Boolean(ui.sheet));
  el.scrim.classList.toggle("strong", ui.sheet === "conflict");
  el.sortmenu.classList.toggle("on", ui.menu === "sort");
  el.menu.classList.toggle("on", ui.menu === "detail");
  el.sortbtn.setAttribute("aria-expanded", String(ui.menu === "sort"));
  el.app.classList.toggle("searching", ui.searching);
}

/* ------------------------------------------------------------
   Form — one sheet for both add and edit. Its fields are filled
   here, on open, and never touched again by renderAll, so typing
   is never clobbered.
   ------------------------------------------------------------ */
function openForm(id) {
  const b = id ? byId(id) : null;
  ui.editing = b ? b.id : null;
  ui.sheet = "form";
  ui.menu = null;
  el.formHeading.textContent = b ? "Edit book" : "Add a book";
  el.fTitle.value = b ? b.title : "";
  el.fAuthor.value = b ? b.author : "";
  el.fDate.value = b && b.readDate ? b.readDate : "";
  el.fFave.setAttribute("aria-pressed", String(Boolean(b && b.fave)));
  el.fNotes.value = b ? b.notes : "";
  const hasNotes = Boolean(b && b.notes);
  el.fNoteswrap.classList.toggle("hidden", !hasNotes);
  el.fNoteadd.classList.toggle("hidden", hasNotes);
  setFormStatus(b ? b.status : STATUSES[0].key, { prefill: false });
  renderAll();
  // focus the title only when adding; when editing, leave focus alone —
  // Firefox and Safari select a focused input's contents
  if (!b) el.fTitle.focus();
}

function setFormStatus(key, { prefill }) {
  ui.formStatus = key;
  el.fStatus.innerHTML = pickerHtml("form-status", key);
  const isRead = key === "read";
  el.fDatewrap.classList.toggle("hidden", !isRead);
  if (isRead && prefill && !el.fDate.value) el.fDate.value = todayStr();
}

function saveForm() {
  const title = el.fTitle.value.trim();
  if (!title) {
    el.fTitle.focus();
    return;
  }
  const fields = {
    status: ui.formStatus,
    title,
    author: el.fAuthor.value.trim(),
    // whatever the field holds at save time is what is stored — a read
    // book with a cleared date is a legal state
    readDate: ui.formStatus === "read" ? (el.fDate.value || null) : null,
    fave: el.fFave.getAttribute("aria-pressed") === "true",
    notes: el.fNotes.value,
  };
  let id;
  if (ui.editing) {
    const b = byId(ui.editing);
    if (!b) return;
    Object.assign(b, fields);
    id = b.id;
  } else {
    id = genId();
    books.unshift({ id, ...fields }); // a new book goes to the front
  }
  ui.sheet = null;
  ui.editing = null;
  commit(id);
}

/* ------------------------------------------------------------
   Sync protocol — the gist is the shared copy. Pushing is always
   a deliberate act, never automatic.
   ------------------------------------------------------------ */
function headers(token) {
  return {
    "Authorization": `Bearer ${token}`,
    "Accept": "application/vnd.github+json",
  };
}
function httpError(status) {
  const err = new Error(`HTTP ${status}`);
  err.reason =
    status === 401 ? "Token rejected" :
    status === 404 ? "Gist not found" :
    `Request failed (HTTP ${status})`;
  return err;
}

async function readGist(gistId, token) {
  let res;
  try {
    res = await fetch(API + encodeURIComponent(gistId), { headers: headers(token) });
  } catch {
    const err = new Error("network");
    err.reason = "Could not reach GitHub";
    throw err;
  }
  if (!res.ok) throw httpError(res.status);
  const g = await res.json();
  const file = g.files && g.files["books.json"];
  let list = null;
  const exists = Boolean(file && typeof file.content === "string");
  if (exists) {
    try {
      const parsed = JSON.parse(file.content);
      if (Array.isArray(parsed)) list = parsed;
    } catch { /* unreadable content reads as an empty gist */ }
  }
  return {
    books: list,
    exists,
    version: g.history && g.history[0] ? g.history[0].version : null,
    updatedAt: g.updated_at || null,
  };
}

/* Push: read first, compare version markers, only then write.
   `skipCheck` is the conflict dialog's shortcut — re-running the
   check would find the same mismatch and reopen the dialog forever. */
async function push({ skipCheck = false } = {}) {
  if (!isConnected() || ui.busy) return;
  ui.busy = true;
  renderAll();
  try {
    const remote = await readGist(settings.gistId, settings.token);
    if (!skipCheck && sync.version && remote.version && remote.version !== sync.version) {
      conflictInfo = {
        cloudAt: remote.updatedAt,
        cloudCount: remote.books ? remote.books.length : 0,
      };
      ui.msg = "conflict";
      ui.sheet = "conflict";
      return;
    }
    let res;
    try {
      res = await fetch(API + encodeURIComponent(settings.gistId), {
        method: "PATCH",
        headers: headers(settings.token),
        body: JSON.stringify({ files: { "books.json": { content: JSON.stringify(books, null, 2) } } }),
      });
    } catch {
      const err = new Error("network");
      err.reason = "Could not reach GitHub";
      throw err;
    }
    if (!res.ok) throw httpError(res.status);
    const g = await res.json();
    sync.version = g.history && g.history[0] ? g.history[0].version : sync.version;
    sync.dirty = false;
    sync.touched = [];
    sync.pushedAt = Date.now();
    sync.cloudAt = g.updated_at || null;
    ui.msg = "";
    ui.msgText = "";
    conflictInfo = null;
    if (ui.sheet === "conflict") ui.sheet = "backup";
  } catch (err) {
    // a failed request never clears dirty and never touches the books
    ui.msg = "err";
    ui.msgText = err.reason || "Request failed";
  } finally {
    ui.busy = false;
    persist();
    renderAll();
  }
}

/* Pull: replace the device's books with the gist's. `skipConfirm` is
   the conflict dialog's shortcut — it has already stated the cost. */
async function pull({ skipConfirm = false } = {}) {
  if (!isConnected() || ui.busy) return;
  if (sync.dirty && !skipConfirm &&
      !confirm("Loading from cloud replaces everything on this device, including your unsaved changes. Continue?")) {
    return;
  }
  ui.busy = true;
  renderAll();
  try {
    const remote = await readGist(settings.gistId, settings.token);
    usedIds.clear();
    books = (remote.books || []).map(normalise);
    sync.version = remote.version;
    sync.cloudAt = remote.updatedAt;
    sync.dirty = false;
    sync.touched = [];
    ui.msg = "";
    ui.msgText = "";
    conflictInfo = null;
    if (ui.selected && !byId(ui.selected)) ui.selected = null;
    if (ui.sheet === "conflict") ui.sheet = "backup";
  } catch (err) {
    ui.msg = "err";
    ui.msgText = err.reason || "Request failed";
  } finally {
    ui.busy = false;
    persist();
    renderAll();
  }
}

/* Connect: prove the id and token work by reading, then decide which
   side is the established copy. */
async function connect() {
  if (ui.busy) return;
  const gistId = el.sGist.value.trim();
  const token = el.sToken.value.trim();
  if (!gistId || !token) {
    ui.settingsMsg = { cls: "err", text: "Enter both a gist ID and a token." };
    renderAll();
    return;
  }
  ui.busy = true;
  ui.settingsMsg = null;
  renderAll();
  try {
    const remote = await readGist(gistId, token);
    settings = { gistId, token };
    saveSettings();
    if (remote.books && remote.books.length) {
      // the gist is the established copy; the device is joining it
      usedIds.clear();
      books = remote.books.map(normalise);
      sync.dirty = false;
      if (ui.selected && !byId(ui.selected)) ui.selected = null;
    } else {
      // the device is the established copy; the gist is waiting
      sync.dirty = books.length > 0;
    }
    sync.touched = [];
    sync.version = remote.version;
    sync.cloudAt = remote.updatedAt;
    sync.pushedAt = null;
    ui.msg = "";
    ui.msgText = "";
    ui.settingsMsg = { cls: "ok", text: "Connected." };
  } catch (err) {
    ui.settingsMsg = { cls: "err", text: err.reason || "Request failed" };
  } finally {
    ui.busy = false;
    persist();
    renderAll();
  }
}

/* Disconnecting is forgetting where to sync, not deleting a library. */
function disconnect() {
  settings = { gistId: null, token: null };
  saveSettings();
  sync = { dirty: false, version: null, pushedAt: null, cloudAt: null, touched: [] };
  ui.msg = "";
  ui.msgText = "";
  conflictInfo = null;
  ui.settingsMsg = { cls: "ok", text: "Disconnected. Your books stay on this device." };
  el.sGist.value = "";
  el.sToken.value = "";
  persist();
  renderAll();
}

/* ------------------------------------------------------------
   Sheets, menus, dismissal
   ------------------------------------------------------------ */
function openSettings() {
  ui.sheet = "settings";
  ui.settingsMsg = null;
  el.sGist.value = settings.gistId || "";
  el.sToken.value = settings.token || "";
  setTokenMasked(true);
  renderAll();
}

function closeSheet() {
  if (ui.sheet === "form") ui.editing = null;
  ui.sheet = null;
  renderAll();
}

function openMenu(which, btn) {
  // measure before rendering — renderAll rebuilds the detail pane, which
  // detaches the three-dot button, and a detached element measures 0,0
  const r = btn.getBoundingClientRect();
  ui.menu = which;
  renderAll();
  const m = which === "sort" ? el.sortmenu : el.menu;
  const pad = 8;
  const left = Math.max(pad, Math.min(r.right - m.offsetWidth, window.innerWidth - m.offsetWidth - pad));
  const top = Math.min(r.bottom + 4, window.innerHeight - m.offsetHeight - pad);
  m.style.left = `${left}px`;
  m.style.top = `${top}px`;
}

function closeMenus() {
  if (ui.menu) {
    ui.menu = null;
    renderAll();
  }
}

/* token masking: CSS text-security on a plain text input, with a real
   password field only as the fallback where that is unsupported */
const MASK_SUPPORTED =
  (window.CSS && (CSS.supports("-webkit-text-security", "disc") || CSS.supports("text-security", "disc")));
function setTokenMasked(masked) {
  if (MASK_SUPPORTED) {
    el.sToken.classList.toggle("masked", masked);
  } else {
    el.sToken.type = masked ? "password" : "text";
  }
  const btn = el.sheetSettings.querySelector('[data-act="reveal"]');
  btn.setAttribute("aria-pressed", String(!masked));
  btn.setAttribute("aria-label", masked ? "Show token" : "Hide token");
}
function tokenIsMasked() {
  return MASK_SUPPORTED ? el.sToken.classList.contains("masked") : el.sToken.type === "password";
}

/* ------------------------------------------------------------
   Events — one delegated click listener; buttons declare their
   intent in data-act.
   ------------------------------------------------------------ */
document.addEventListener("click", (e) => {
  const actEl = e.target.closest("[data-act]");
  const act = actEl ? actEl.dataset.act : null;

  // clicking outside an open menu closes it (its opener toggles instead)
  if (ui.menu && !e.target.closest(".menu") && act !== "sort-menu" && act !== "menu") {
    closeMenus();
  }
  if (!act) return;

  switch (act) {
    case "open":
      ui.selected = actEl.dataset.id;
      renderAll();
      break;
    case "close-detail":
      ui.selected = null;
      renderAll();
      break;
    case "filter":
      ui.filter = actEl.dataset.filter;
      renderAll();
      break;
    case "search-toggle":
      ui.searching = !ui.searching;
      if (!ui.searching) {
        // a hidden search can never quietly filter the list
        ui.query = "";
        el.search.value = "";
      }
      renderAll();
      if (ui.searching) el.search.focus();
      break;
    case "search-clear":
      ui.query = "";
      el.search.value = "";
      renderList();
      el.search.focus();
      break;
    case "sort-menu":
      if (ui.menu === "sort") closeMenus();
      else openMenu("sort", actEl);
      break;
    case "sort":
      ui.sort = SORT_KEYS.includes(actEl.dataset.sort) ? actEl.dataset.sort : "manual";
      ui.menu = null;
      persist(); // the chosen order survives a reload
      renderAll();
      break;
    case "menu":
      if (ui.menu === "detail") closeMenus();
      else openMenu("detail", actEl);
      break;
    case "add":
      openForm(null);
      break;
    case "edit":
      openForm(ui.selected);
      break;
    case "delete": {
      const b = byId(ui.selected);
      ui.menu = null;
      if (b && confirm(`Delete “${titleOf(b)}”? This can't be undone.`)) {
        books = books.filter((x) => x.id !== b.id);
        sync.touched = sync.touched.filter((t) => t !== b.id);
        ui.selected = null;
        commit(null);
      } else {
        renderAll();
      }
      break;
    }
    case "detail-status": {
      const b = byId(ui.selected);
      const key = actEl.dataset.status;
      if (b && STATUS_BY_KEY[key] && b.status !== key) {
        b.status = key;
        if (key === "read") {
          if (!b.readDate) b.readDate = todayStr();
        } else {
          b.readDate = null;
        }
        commit(b.id);
      }
      break;
    }
    case "form-status":
      setFormStatus(actEl.dataset.status, { prefill: true });
      break;
    case "fave":
      el.fFave.setAttribute("aria-pressed", String(el.fFave.getAttribute("aria-pressed") !== "true"));
      break;
    case "note-add":
      el.fNoteadd.classList.add("hidden");
      el.fNoteswrap.classList.remove("hidden");
      el.fNotes.focus();
      break;
    case "backup":
      ui.sheet = "backup";
      renderAll();
      break;
    case "settings":
      openSettings();
      break;
    case "connect":
      connect();
      break;
    case "disconnect":
      disconnect();
      break;
    case "reveal":
      setTokenMasked(!tokenIsMasked());
      break;
    case "push":
      push();
      break;
    case "pull":
      pull();
      break;
    case "conflict-pull":
      // the dialog has already stated the cost — no second prompt
      pull({ skipConfirm: true });
      break;
    case "conflict-force":
      // re-running the check would reopen this dialog forever
      push({ skipCheck: true });
      break;
    case "close":
    case "scrim":
      closeSheet();
      break;
  }
});

el.sheetForm.addEventListener("submit", (e) => {
  e.preventDefault();
  saveForm();
});

el.search.addEventListener("input", () => {
  ui.query = el.search.value;
  renderList();
});

/* Escape closes, in this order, whichever applies first:
   an open menu, then an open sheet, then the detail view. */
document.addEventListener("keydown", (e) => {
  if (e.key !== "Escape") return;
  if (ui.menu) closeMenus();
  else if (ui.sheet) closeSheet();
  else if (ui.selected) {
    ui.selected = null;
    renderAll();
  }
});

/* resizing the window closes any open menu */
window.addEventListener("resize", closeMenus);

/* warn before leaving with unsaved changes — only when a gist is
   actually connected */
window.addEventListener("beforeunload", (e) => {
  if (isConnected() && sync.dirty) {
    e.preventDefault();
    e.returnValue = "";
  }
});

/* ------------------------------------------------------------
   Boot
   ------------------------------------------------------------ */

/* iOS Safari zooms the page when a focused field's font-size is under
   16px. Capping the viewport scale suppresses that auto-zoom, and Safari
   still allows pinch-zoom regardless of the cap — but Android Chrome
   would honour it and lock pinch-zoom out, so the cap is iOS-only. */
if (/iPhone|iPad|iPod/.test(navigator.userAgent) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1)) {
  document.querySelector('meta[name="viewport"]').content += ", maximum-scale=1";
}

(function init() {
  const rawBooks = load(KEYS.books, []);
  books = (Array.isArray(rawBooks) ? rawBooks : []).map(normalise);
  // write the structural repair back so a minted id is the same id
  // next time; this is repair, not an edit — dirty is untouched
  store(KEYS.books, books);

  const rawSettings = load(KEYS.settings, {});
  if (rawSettings && typeof rawSettings === "object") {
    settings = {
      gistId: typeof rawSettings.gistId === "string" ? rawSettings.gistId : null,
      token: typeof rawSettings.token === "string" ? rawSettings.token : null,
    };
  }

  const rawSync = load(KEYS.sync, {});
  if (rawSync && typeof rawSync === "object") {
    sync = {
      dirty: Boolean(rawSync.dirty),
      version: typeof rawSync.version === "string" ? rawSync.version : null,
      pushedAt: typeof rawSync.pushedAt === "number" ? rawSync.pushedAt : null,
      cloudAt: typeof rawSync.cloudAt === "string" ? rawSync.cloudAt : null,
      touched: Array.isArray(rawSync.touched) ? rawSync.touched.filter((t) => typeof t === "string") : [],
    };
  }

  const rawPrefs = load(KEYS.prefs, {});
  if (rawPrefs && SORT_KEYS.includes(rawPrefs.sort)) ui.sort = rawPrefs.sort;

  if (!MASK_SUPPORTED) el.sToken.type = "password";

  renderAll();
})();
