/* Shelf — a personal reading tracker.
 *
 * One book is { id, title, author, status, dateRead, favourite, notes, addedAt }
 * and nothing else. There is no progress tracking here and there is not going
 * to be any: no page counts, no percentages, no sessions, no ratings.
 *
 * Data lives in localStorage and syncs, on demand, to one JSON file in a
 * GitHub gist. The token is read from localStorage, sent in the Authorization
 * header of a request to api.github.com, and never logged or sent anywhere
 * else.
 */
(function () {
  "use strict";

  /* ─── The data ──────────────────────────────────────────────────────── */

  var STATUSES = {
    reading: { label: "Reading", badge: "Reading", short: "CR", tone: "badge--reading" },
    tbr: { label: "To read", badge: "To read", short: "TBR", tone: "badge--tbr" },
    read: { label: "Read", badge: "Read", short: "R", tone: "badge--read" },
    dropped: { label: "Dropped", badge: "Dropped", short: "DNF", tone: "badge--dropped" }
  };

  var STATUS_ORDER = ["reading", "tbr", "read", "dropped"];

  /* Older names that still mean one of the four above. normalise() falls back
   * to `tbr` on anything it does not recognise, which is silent — a shelf
   * saved under an old name would quietly lose its status rather than error.
   * Keep this map; it costs nothing and it is the difference between a file
   * loading and a file looking like it loaded. */
  var LEGACY_STATUS = { dnf: "dropped" };

  var FILTERS = [
    { id: "all", label: "All books" },
    { id: "reading", label: "Reading" },
    { id: "tbr", label: "To read" },
    { id: "read", label: "Read" },
    { id: "dropped", label: "Dropped" },
    { id: "favourites", label: "Favourites" }
  ];

  /* The order Main.png draws the menu in. */
  var SORTS = [
    { id: "added", label: "Date added" },
    { id: "title", label: "Title" },
    { id: "author", label: "Author" },
    { id: "status", label: "Status" },
    { id: "dateRead", label: "Date read" }
  ];

  var KEYS = {
    books: "shelf.books",
    sort: "shelf.sort",
    gistId: "shelf.gistId",
    token: "shelf.token",
    lastSaved: "shelf.lastSaved"
  };

  /* The gist already holds one file under this name, and so does the repo.
   * Writing to any other name would leave a second, stale copy beside it and
   * the two would drift. pickFile() still falls back to the first .json in the
   * gist, so an older file under a different name still loads. */
  var GIST_FILE = "books.json";
  var ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

  /* ─── Icons ───────────────────────────────────────────────────────────
   * Outline, 24 viewBox, stroke-width 2, round caps and joins, drawn at 24
   * and displayed at 16 or 20 — the system's convention. currentColor
   * throughout, so nothing needs per-scheme handling.
   *
   * The heart is the one exception: it is filled. It appears only on a book
   * that IS a favourite, and an outline heart is the near-universal mark for
   * the opposite. Drawn hollow it would read as "not favourited". */
  var ICONS = {
    plus: { d: '<path d="M12 5v14"/><path d="M5 12h14"/>' },
    search: { d: '<circle cx="11" cy="11" r="7"/><path d="M20.5 20.5l-4.2 -4.2"/>' },
    sort: { d: '<path d="M3 9l4 -4l4 4m-4 -4v14"/><path d="M21 15l-4 4l-4 -4m4 4v-14"/>' },
    cloud: {
      d:
        '<path d="M6.657 18c-2.572 0 -4.657 -2.007 -4.657 -4.483c0 -2.475 2.085 -4.482 4.657 -4.482c.393 -1.762 1.794 -3.2 3.675 -3.773c1.88 -.572 3.956 -.193 5.444 1c1.488 1.19 2.162 3.007 1.77 4.769h.99c1.913 0 3.464 1.56 3.464 3.486c0 1.927 -1.551 3.487 -3.465 3.487h-11.878"/>'
    },
    close: { d: '<path d="M18 6l-12 12"/><path d="M6 6l12 12"/>' },
    check: { d: '<path d="M5 12l5 5l10 -10"/>' },
    calendar: {
      d: '<rect x="4" y="5" width="16" height="16" rx="2"/><path d="M16 3v4"/><path d="M8 3v4"/><path d="M4 11h16"/>'
    },
    eye: {
      d: '<path d="M2 12s3.6 -7 10 -7s10 7 10 7s-3.6 7 -10 7s-10 -7 -10 -7z"/><circle cx="12" cy="12" r="3"/>'
    },
    eyeOff: {
      d:
        '<path d="M3 3l18 18"/><path d="M10.6 5.2a9.9 9.9 0 0 1 1.4 -.2c6.4 0 10 7 10 7a17.7 17.7 0 0 1 -3.2 4.2"/>' +
        '<path d="M6.6 6.6a17.7 17.7 0 0 0 -4.6 5.4s3.6 7 10 7a9.9 9.9 0 0 0 4.2 -.9"/><path d="M9.9 9.9a3 3 0 0 0 4.2 4.2"/>',
    },
    heart: {
      fill: true,
      d: '<path d="M19.5 12.572l-7.5 7.428l-7.5 -7.428a5 5 0 1 1 7.5 -6.566a5 5 0 1 1 7.5 6.572"/>'
    }
  };

  function icon(name) {
    var spec = ICONS[name];
    var svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    svg.setAttribute("viewBox", "0 0 24 24");
    svg.setAttribute("fill", spec.fill ? "currentColor" : "none");
    svg.setAttribute("stroke", "currentColor");
    svg.setAttribute("stroke-width", "2");
    svg.setAttribute("stroke-linecap", "round");
    svg.setAttribute("stroke-linejoin", "round");
    svg.setAttribute("aria-hidden", "true");
    svg.innerHTML = spec.d;
    return svg;
  }

  /* ─── DOM helper ──────────────────────────────────────────────────────
   * Every value that came from the user goes in as text or as an attribute,
   * never as markup. */

  function el(tag, props) {
    var node = document.createElement(tag);
    var p = props || {};
    Object.keys(p).forEach(function (k) {
      var v = p[k];
      if (v === null || v === undefined || v === false) return;
      if (k === "class") node.className = v;
      else if (k === "text") node.textContent = v;
      else if (k === "dataset") Object.assign(node.dataset, v);
      else if (k.slice(0, 2) === "on") node.addEventListener(k.slice(2).toLowerCase(), v);
      else node.setAttribute(k, v === true ? "" : v);
    });
    for (var i = 2; i < arguments.length; i++) append(node, arguments[i]);
    return node;
  }

  function append(node, kid) {
    if (kid === null || kid === undefined || kid === false) return;
    if (Array.isArray(kid)) {
      kid.forEach(function (k) { append(node, k); });
      return;
    }
    node.append(kid.nodeType ? kid : document.createTextNode(String(kid)));
  }

  function clear(node) {
    while (node.firstChild) node.removeChild(node.firstChild);
    return node;
  }

  /* ─── Storage ─────────────────────────────────────────────────────────
   * Every read and write is wrapped: a blocked-storage context still gets a
   * working app for the session. */

  function read(key, fallback) {
    try {
      var raw = localStorage.getItem(key);
      return raw === null ? fallback : raw;
    } catch (e) {
      return fallback;
    }
  }

  function write(key, value) {
    try {
      if (value === null || value === "") localStorage.removeItem(key);
      else localStorage.setItem(key, value);
    } catch (e) {
      /* nothing to do — the session still works, it just will not persist */
    }
  }

  function loadBooks() {
    try {
      var parsed = JSON.parse(read(KEYS.books, "[]"));
      return Array.isArray(parsed) ? parsed.map(normalise) : [];
    } catch (e) {
      return [];
    }
  }

  function saveBooks() {
    write(KEYS.books, JSON.stringify(state.books));
  }

  /* Anything arriving from storage or from the gist goes through here, so a
   * hand-edited file cannot put a field the app does not understand — or a
   * dateRead on a book that is not read — into the running state. */
  function normalise(raw) {
    var b = raw && typeof raw === "object" ? raw : {};
    var named = LEGACY_STATUS[b.status] || b.status;
    var status = STATUSES[named] ? named : "tbr";
    var date = typeof b.dateRead === "string" && ISO_DATE.test(b.dateRead) ? b.dateRead : null;
    return {
      id: typeof b.id === "string" && b.id ? b.id : newId(),
      title: typeof b.title === "string" ? b.title : "",
      author: typeof b.author === "string" ? b.author : "",
      status: status,
      dateRead: status === "read" ? date : null,
      favourite: b.favourite === true,
      notes: typeof b.notes === "string" ? b.notes : "",
      addedAt: typeof b.addedAt === "string" && b.addedAt ? b.addedAt : new Date().toISOString()
    };
  }

  function newId() {
    if (window.crypto && window.crypto.randomUUID) return window.crypto.randomUUID();
    return "b" + Date.now().toString(36) + Math.random().toString(36).slice(2, 10);
  }

  /* ─── State ───────────────────────────────────────────────────────────── */

  var state = {
    books: [],
    filter: "all",
    sort: "added",
    query: "",
    searchOpen: false
  };

  /* The open overlay, if any. `confirm` swaps the modal's contents in place
   * rather than stacking a second dialog on top — same frame, same size, new
   * heading, body and footer — and `draft` is what lets Cancel put an
   * half-filled form back exactly as it was. */
  var ui = {
    modal: null, // { kind, bookId, draft, invalid, confirm, opener, busy, status }
    menu: false,
    returnFocus: null
  };

  /* ─── Derived ─────────────────────────────────────────────────────────── */

  function matchesFilter(book, filter) {
    if (filter === "all") return true;
    if (filter === "favourites") return book.favourite;
    return book.status === filter;
  }

  function counts() {
    var out = { all: state.books.length, favourites: 0, reading: 0, tbr: 0, read: 0, dropped: 0 };
    state.books.forEach(function (b) {
      out[b.status]++;
      if (b.favourite) out.favourites++;
    });
    return out;
  }

  var COMPARE = {
    added: function (a, b) { return cmp(b.addedAt, a.addedAt); },
    dateRead: function (a, b) {
      if (!a.dateRead && !b.dateRead) return cmp(b.addedAt, a.addedAt);
      if (!a.dateRead) return 1;
      if (!b.dateRead) return -1;
      return cmp(b.dateRead, a.dateRead);
    },
    title: function (a, b) { return a.title.localeCompare(b.title); },
    author: function (a, b) { return a.author.localeCompare(b.author); },
    /* STATUS_ORDER, not the alphabet: the four are a sequence a book moves
     * through, and it is the same order the sidebar and the form's radios
     * already put them in. Within a status, newest added first — the default
     * order, so a group reads the way the whole list does. */
    status: function (a, b) {
      return (STATUS_ORDER.indexOf(a.status) - STATUS_ORDER.indexOf(b.status)) ||
        cmp(b.addedAt, a.addedAt);
    }
  };

  function cmp(a, b) { return a < b ? -1 : a > b ? 1 : 0; }

  function visibleBooks() {
    var q = state.query.trim().toLowerCase();
    return state.books
      .filter(function (b) { return matchesFilter(b, state.filter); })
      .filter(function (b) {
        if (!q) return true;
        return (b.title + " " + b.author).toLowerCase().indexOf(q) > -1;
      })
      .sort(COMPARE[state.sort] || COMPARE.added);
  }

  /* ─── Library ─────────────────────────────────────────────────────────── */

  var nodes = {};

  function renderFilters() {
    var c = counts();

    var group = el("div", { class: "nav__group" },
      el("p", { class: "label nav__heading", text: "Status" }),
      FILTERS.slice(0, 5).map(function (f) { return navItem(f, c[f.id]); })
    );

    clear(nodes.filters);
    append(nodes.filters, [
      group,
      el("span", { class: "nav__rule", "aria-hidden": "true" }),
      navItem(FILTERS[5], c.favourites)
    ]);

    clear(nodes.chips);
    append(nodes.chips, FILTERS.map(function (f) { return chip(f, c[f.id]); }));
  }

  function navItem(filter, count) {
    return el("button", {
      type: "button",
      class: "nav__item selectable",
      "aria-pressed": String(state.filter === filter.id),
      onclick: function () { setFilter(filter.id); }
    },
      el("span", { text: filter.label }),
      el("span", { class: "code-sm nav__count", text: String(count) })
    );
  }

  /* Per components/Badge.md a filter chip is a button carrying
   * `badge badge--neutral selectable` and aria-pressed. Nothing swaps
   * classes — the attribute does all of it. */
  function chip(filter, count) {
    return el("button", {
      type: "button",
      class: "badge badge--neutral selectable",
      "aria-pressed": String(state.filter === filter.id),
      onclick: function () { setFilter(filter.id); }
    },
      el("span", { text: filter.label }),
      el("span", { class: "num", text: String(count) })
    );
  }

  function setFilter(id) {
    state.filter = id;
    renderFilters();
    renderLibrary();
  }

  function renderLibrary() {
    var books = visibleBooks();
    clear(nodes.content);

    if (!books.length) {
      append(nodes.content, emptyState());
      return;
    }

    var list = el("div", { class: "card list" },
      el("div", { class: "label list__head", "aria-hidden": "true" },
        el("span", { text: "Status" }),
        el("span", { text: "Title" }),
        el("span", { text: "Author" }),
        el("span", { class: "list__head-date", text: "Date read" }),
        el("span")
      ),
      books.map(bookRow)
    );

    append(nodes.content, list);
  }

  /* The whole row is one click target, heart included: the heart is a
   * display-only indicator and favouriting happens in the form. That is why
   * this is a grid of buttons and not a <table>. */
  function bookRow(book) {
    var status = STATUSES[book.status];
    var dated = Boolean(book.dateRead);

    var badge = el("span", { class: "badge " + status.tone },
      el("span", { "aria-hidden": "true", class: "row__badge-long", text: status.badge }),
      el("span", { "aria-hidden": "true", class: "row__badge-short", text: status.short }),
      el("span", { class: "sr-only", text: status.label })
    );

    return el("button", {
      type: "button",
      class: "row" + (dated ? "" : " row--undated"),
      onclick: function () { openDetails(book.id); }
    },
      el("span", { class: "row__status" }, badge),
      el("span", { class: "row__main" },
        el("span", { class: "row__title", text: book.title }),
        el("span", { class: "row__meta" },
          el("span", { class: "row__author", text: book.author }),
          el("span", { class: "row__sep", "aria-hidden": "true", text: "·" }),
          dated
            ? el("span", { class: "row__date num", text: book.dateRead })
            : el("span", { class: "row__date num", "aria-hidden": "true", text: "—" })
        )
      ),
      el("span", { class: "row__fav" },
        book.favourite ? [icon("heart"), el("span", { class: "sr-only", text: "Favourite" })] : null
      )
    );
  }

  function emptyState() {
    var title, body;
    var label = (FILTERS.filter(function (f) { return f.id === state.filter; })[0] || {}).label;

    if (state.query.trim()) {
      title = "Nothing matches that search.";
      body = "Try part of a title or an author's name.";
    } else if (!state.books.length) {
      title = "Your shelf is empty.";
      body = "Add a book and it will show up here.";
    } else if (state.filter === "favourites") {
      title = "No favourites yet.";
      body = "Mark a book as a favourite and it will show up here.";
    } else {
      title = "Nothing in " + label.toLowerCase() + ".";
      body = "Books you give this status will show up here.";
    }

    return el("div", { class: "empty" },
      el("p", { class: "h3 empty__title", text: title }),
      el("p", { class: "body-sm empty__body", text: body })
    );
  }

  /* ─── Search ──────────────────────────────────────────────────────────── */

  function setSearchOpen(open) {
    state.searchOpen = open;
    nodes.app.dataset.search = open ? "open" : "closed";
    if (open) nodes.search.focus();
    else {
      clearSearch();
      var opener = document.querySelector('[data-action="search-open"]');
      if (opener) opener.focus();
    }
  }

  /* The clear control is only in the DOM while there is something to clear —
   * an always-present ✕ over an empty field is a button that does nothing. */
  function syncSearchClear() {
    nodes.searchClear.hidden = nodes.search.value === "";
  }

  function clearSearch() {
    state.query = "";
    nodes.search.value = "";
    syncSearchClear();
    renderLibrary();
  }

  /* ─── Sort menu ───────────────────────────────────────────────────────── */

  function toggleMenu() {
    if (ui.menu) return closeMenu();

    var button = document.getElementById("sort-button");
    var menu = el("div", { class: "overlay menu", id: "sort-menu", "aria-label": "Sort by" },
      el("p", { class: "label menu__heading", text: "Sort by" }),
      SORTS.map(function (s) {
        var on = state.sort === s.id;
        return el("button", {
          type: "button",
          class: "menu__item selectable",
          "aria-pressed": String(on),
          onclick: function () {
            state.sort = s.id;
            write(KEYS.sort, s.id);
            closeMenu();
            renderLibrary();
            button.focus();
          }
        },
          el("span", { text: s.label }),
          on ? icon("check") : null
        );
      })
    );

    nodes.overlayRoot.append(menu);

    /* The menu is position: fixed, so its offsets are against the viewport's
     * content box — which excludes the scrollbar. window.innerWidth includes
     * it, and using that pulls the menu 15px off the button it belongs to. */
    var box = button.getBoundingClientRect();
    menu.style.top = box.bottom + 8 + "px";
    menu.style.right = document.documentElement.clientWidth - box.right + "px";

    button.setAttribute("aria-expanded", "true");
    ui.menu = true;
    menu.querySelector("button").focus();

    setTimeout(function () {
      document.addEventListener("pointerdown", onMenuOutside, true);
    }, 0);
  }

  function onMenuOutside(e) {
    var menu = document.getElementById("sort-menu");
    if (menu && !menu.contains(e.target) && !e.target.closest('[data-action="sort"]')) closeMenu();
  }

  function closeMenu() {
    var menu = document.getElementById("sort-menu");
    if (menu) menu.remove();
    var button = document.getElementById("sort-button");
    if (button) button.setAttribute("aria-expanded", "false");
    document.removeEventListener("pointerdown", onMenuOutside, true);
    ui.menu = false;
  }

  /* ─── Modal frame ─────────────────────────────────────────────────────
   * The panel is an ordinary .card and takes no shadow — the scrim is
   * already doing that job. Escape, the backdrop and the ✕ all close it, it
   * traps focus, it is labelled by its own heading, and it gives focus back
   * to whatever opened it. */

  function openModal(modal) {
    if (ui.menu) closeMenu();
    if (!ui.modal) ui.returnFocus = document.activeElement;
    ui.modal = modal;
    renderModal();
  }

  function closeModal() {
    ui.modal = null;
    clear(nodes.overlayRoot);
    document.body.style.overflow = "";
    if (ui.returnFocus && document.contains(ui.returnFocus)) ui.returnFocus.focus();
    ui.returnFocus = null;
  }

  function renderModal() {
    var m = ui.modal;
    /* The contents are rebuilt whenever the view changes — a confirmation
     * swapping in, a validation message appearing. Remember where focus was
     * so a re-render does not throw the caret back to the first field. */
    var wasOn = document.activeElement && document.activeElement.id;
    clear(nodes.overlayRoot);
    if (!m) return;

    var view = m.confirm ? CONFIRMS[m.confirm]() : VIEWS[m.kind]();
    var titleId = "modal-title";

    var head = el("div", { class: "modal__head" },
      el("h2", { class: "h3 modal__title", id: titleId, text: view.title }),
      el("button", {
        type: "button",
        class: "btn btn--ghost icon-btn",
        "aria-label": "Close",
        onclick: closeModal
      }, icon("close"))
    );

    var foot = el("div", { class: "modal__foot" }, view.actions);

    var panel = el("div", {
      class: "card modal__panel",
      role: "dialog",
      "aria-modal": "true",
      "aria-labelledby": titleId
    }, head, el("div", { class: "modal__scroll" },
      el("div", { class: "modal__body" }, view.body),
      foot
    ));

    var isDialog = Boolean(m.confirm);
    var wrap = el("div", { class: "modal" + (isDialog ? " modal--dialog" : "") },
      el("div", { class: "backdrop", onclick: closeModal }),
      panel
    );

    append(nodes.overlayRoot, wrap);
    document.body.style.overflow = "hidden";

    panel.addEventListener("keydown", trap);

    var focusTarget =
      (m.focus && panel.querySelector(m.focus)) ||
      (!m.focus && wasOn && panel.querySelector("#" + CSS.escape(wasOn)));

    (focusTarget || panel.querySelector(FOCUSABLE) || panel).focus();
    m.focus = null;
  }

  var FOCUSABLE =
    'a[href], button:not(:disabled), input:not(:disabled), select:not(:disabled), textarea:not(:disabled), [tabindex]:not([tabindex="-1"])';

  function trap(e) {
    if (e.key !== "Tab") return;
    var items = Array.prototype.filter.call(
      this.querySelectorAll(FOCUSABLE),
      function (n) { return n.offsetParent !== null || n === document.activeElement; }
    );
    if (!items.length) return;
    var first = items[0];
    var last = items[items.length - 1];
    if (e.shiftKey && document.activeElement === first) {
      e.preventDefault();
      last.focus();
    } else if (!e.shiftKey && document.activeElement === last) {
      e.preventDefault();
      first.focus();
    }
  }

  function bookById(id) {
    return state.books.filter(function (b) { return b.id === id; })[0] || null;
  }

  /* ─── Book details ────────────────────────────────────────────────────── */

  function openDetails(id) {
    openModal({ kind: "details", bookId: id });
  }

  var VIEWS = {};

  VIEWS.details = function () {
    var book = bookById(ui.modal.bookId);
    if (!book) return { title: "Book details", body: [], actions: [] };

    var status = STATUSES[book.status];

    var badges = el("div", { class: "detail__badges" },
      el("span", { class: "badge " + status.tone, text: status.badge }),
      book.favourite
        ? el("span", { class: "badge" }, icon("heart"), el("span", { text: "Favourite" }))
        : null
    );

    var body = [
      el("div", { class: "detail__head" },
        el("div", { class: "detail__names" },
          el("h3", { class: "h2 detail__title", text: book.title }),
          el("p", { class: "detail__author", text: book.author })
        ),
        badges
      ),
      /* The date row exists only for a read book — for the other three
       * statuses it is simply absent, not blank. */
      book.dateRead
        ? el("div", { class: "detail__field" },
            el("span", { class: "label detail__label", text: "Date read" }),
            el("div", { class: "panel panel--row" },
              icon("calendar"),
              el("span", { class: "code", text: book.dateRead })
            )
          )
        : null,
      book.notes
        ? el("div", { class: "detail__field" },
            el("span", { class: "label detail__label", text: "Notes" }),
            el("div", { class: "panel panel--notes body-sm", text: book.notes })
          )
        : null
    ];

    /* The opener of a confirmation is an ordinary secondary button; the red
     * belongs to the one inside the confirmation that does the deed. */
    var actions = [
      el("button", {
        type: "button",
        class: "btn btn--secondary",
        dataset: { role: "delete" },
        onclick: function () { askDelete(); }
      }, "Delete book"),
      el("button", {
        type: "button",
        class: "btn btn--primary",
        onclick: function () { openForm(book.id); }
      }, "Edit book")
    ];

    return { title: "Book details", body: body, actions: actions };
  };

  /* ─── Add / edit ──────────────────────────────────────────────────────── */

  function openForm(id) {
    var book = id ? bookById(id) : null;
    openModal({
      kind: "form",
      bookId: id || null,
      draft: book
        ? { title: book.title, author: book.author, status: book.status, dateRead: book.dateRead, favourite: book.favourite, notes: book.notes }
        : { title: "", author: "", status: "tbr", dateRead: null, favourite: false, notes: "" },
      invalid: {}
    });
  }

  VIEWS.form = function () {
    var m = ui.modal;
    var d = m.draft;
    var editing = Boolean(m.bookId);

    var titleField = field({
      id: "book-title",
      label: "Title",
      value: d.title,
      invalid: m.invalid.title,
      hint: m.invalid.title ? "Enter the book's title." : null,
      oninput: function (e) { d.title = e.target.value; }
    });

    var authorField = field({
      id: "book-author",
      label: "Author",
      value: d.author,
      invalid: m.invalid.author,
      hint: m.invalid.author ? "Enter the author's name." : null,
      oninput: function (e) { d.author = e.target.value; }
    });

    /* The date field exists only while Read is selected, and clears when the
     * status moves away from it. The native picker renders in the browser's
     * locale; its value, and everything else in the app, stays ISO. */
    var dateSlot = el("div", { class: "form__date" });

    function paintDate() {
      clear(dateSlot);
      if (d.status !== "read") return;
      append(dateSlot, field({
        id: "book-date",
        label: "Date read",
        type: "date",
        mono: true,
        value: d.dateRead || "",
        oninput: function (e) { d.dateRead = e.target.value || null; }
      }));
    }

    var radios = el("div", { class: "radios" }, STATUS_ORDER.map(function (key) {
      return el("label", { class: "check check--radio" },
        el("input", {
          type: "radio",
          name: "status",
          value: key,
          checked: d.status === key,
          onchange: function () {
            d.status = key;
            if (key !== "read") d.dateRead = null;
            paintDate();
          }
        }),
        el("span", { text: STATUSES[key].label })
      );
    }));

    paintDate();

    var body = [
      el("div", { class: "form" },
        titleField,
        authorField,
        el("fieldset", { class: "fieldset" },
          el("legend", { class: "label fieldset__legend", text: "Status" }),
          radios
        ),
        dateSlot,
        /* A switch, as the wireframes draw it and as Emily asked for directly.
         * components/Checkbox.md reserves the switch for a change that takes
         * effect immediately and would want a checkbox here, since favourite
         * only applies when this form is saved — that was raised and overruled.
         * role="switch" is what makes it announce as on/off rather than
         * checked/unchecked; the class only styles it. Do not "correct" this
         * back to a checkbox. */
        el("label", { class: "check check--switch form__switch" },
          el("input", {
            type: "checkbox",
            role: "switch",
            checked: d.favourite,
            onchange: function (e) { d.favourite = e.target.checked; }
          }),
          el("span", { text: "Favourite" })
        ),
        el("div", { class: "field" },
          el("label", { class: "field__label", for: "book-notes", text: "Notes" }),
          el("textarea", {
            class: "field-area",
            id: "book-notes",
            placeholder: "What you want to remember about it.",
            oninput: function (e) { d.notes = e.target.value; }
          })
        )
      )
    ];

    body[0].querySelector("#book-notes").value = d.notes;

    var actions = [
      editing
        ? el("button", {
            type: "button",
            class: "btn btn--secondary",
            dataset: { role: "delete" },
            onclick: function () { askDelete(); }
          }, "Delete book")
        : null,
      el("button", { type: "button", class: "btn btn--secondary", onclick: closeModal }, "Cancel"),
      el("button", {
        type: "button",
        class: "btn btn--primary",
        onclick: submitForm
      }, editing ? "Save changes" : "Add book")
    ];

    return { title: editing ? "Edit book" : "Add book", body: body, actions: actions };
  };

  /* A label, a control and an optional hint — the Field component. The error
   * is a 2px ink border plus the wording; never danger, which belongs to the
   * button that deletes. */
  function field(opts) {
    var hintId = opts.id + "-hint";
    var input = el("input", {
      class: "field-input" + (opts.mono ? " num" : ""),
      id: opts.id,
      type: opts.type || "text",
      value: opts.value,
      autocomplete: "off",
      "aria-invalid": opts.invalid ? "true" : null,
      "aria-describedby": opts.hint ? hintId : null,
      oninput: opts.oninput
    });

    return el("div", { class: "field", "data-invalid": opts.invalid ? "" : null },
      el("label", { class: "field__label", for: opts.id, text: opts.label }),
      input,
      opts.hint ? el("span", { class: "field__hint", id: hintId, text: opts.hint }) : null
    );
  }

  function submitForm() {
    var m = ui.modal;
    var d = m.draft;

    m.invalid = {
      title: !d.title.trim(),
      author: !d.author.trim()
    };

    if (m.invalid.title || m.invalid.author) {
      m.focus = m.invalid.title ? "#book-title" : "#book-author";
      renderModal();
      return;
    }

    if (m.bookId) {
      var book = bookById(m.bookId);
      Object.assign(book, normalise({
        id: book.id,
        title: d.title.trim(),
        author: d.author.trim(),
        status: d.status,
        dateRead: d.dateRead,
        favourite: d.favourite,
        notes: d.notes,
        addedAt: book.addedAt
      }));
    } else {
      state.books.push(normalise({
        id: newId(),
        title: d.title.trim(),
        author: d.author.trim(),
        status: d.status,
        dateRead: d.dateRead,
        favourite: d.favourite,
        notes: d.notes,
        addedAt: new Date().toISOString()
      }));
    }

    saveBooks();
    closeModal();
    renderFilters();
    renderLibrary();
  }

  /* ─── Cloud settings ──────────────────────────────────────────────────── */

  function openCloud() {
    openModal({
      kind: "cloud",
      draft: { gistId: read(KEYS.gistId, ""), token: read(KEYS.token, ""), reveal: false },
      invalid: {},
      status: null,
      busy: false
    });
  }

  VIEWS.cloud = function () {
    var m = ui.modal;
    var d = m.draft;

    var gist = field({
      id: "gist-id",
      label: "Gist ID",
      mono: true,
      value: d.gistId,
      invalid: m.invalid.gistId,
      hint: m.invalid.gistId
        ? "Add the gist ID before saving or loading."
        : "The 32-character id at the end of the gist's URL.",
      oninput: function (e) {
        d.gistId = e.target.value.trim();
        write(KEYS.gistId, d.gistId);
      }
    });

    var tokenInput = el("input", {
      class: "field-input num",
      id: "gist-token",
      type: d.reveal ? "text" : "password",
      value: d.token,
      autocomplete: "off",
      spellcheck: "false",
      "aria-invalid": m.invalid.token ? "true" : null,
      "aria-describedby": "gist-token-hint",
      oninput: function (e) {
        d.token = e.target.value.trim();
        write(KEYS.token, d.token);
      }
    });

    var eye = el("button", {
      type: "button",
      id: "gist-token-eye",
      class: "btn btn--ghost icon-btn secret__eye",
      "aria-label": d.reveal ? "Hide token" : "Show token",
      "aria-pressed": String(d.reveal),
      onclick: function () {
        d.reveal = !d.reveal;
        m.focus = "#gist-token-eye";
        renderModal();
      }
    }, icon(d.reveal ? "eyeOff" : "eye"));

    var token = el("div", { class: "field", "data-invalid": m.invalid.token ? "" : null },
      el("label", { class: "field__label", for: "gist-token", text: "GitHub access token" }),
      el("div", { class: "secret" }, tokenInput, eye),
      el("span", {
        class: "field__hint",
        id: "gist-token-hint",
        text: m.invalid.token
          ? "Add an access token before saving."
          : "Needs the gist scope, and nothing else."
      })
    );

    var saved = read(KEYS.lastSaved, "");

    var body = [
      el("p", {
        class: "body-sm cloud__intro",
        text: "Your shelf is kept as a JSON file in a GitHub gist. Point it at a gist and give it a token that can write there."
      }),
      gist,
      token,
      saved
        ? el("div", { class: "panel panel--row" },
            el("span", { class: "body-sm" }, icon("cloud"), " Last saved"),
            el("span", { class: "code", text: saved })
          )
        : null,
      m.status
        ? el("p", {
            class: "body-sm cloud__status",
            dataset: { tone: m.status.tone },
            role: "status",
            text: m.status.text
          })
        : null
    ];

    var actions = [
      el("button", {
        type: "button",
        id: "cloud-load",
        class: "btn btn--secondary",
        disabled: m.busy,
        onclick: askLoad
      }, "Load from cloud"),
      el("button", {
        type: "button",
        id: "cloud-save",
        class: "btn btn--primary",
        disabled: m.busy,
        onclick: askSave
      }, "Save to cloud")
    ];

    return { title: "Cloud settings", body: body, actions: actions };
  };

  /* The first row of the last-saved panel wants the icon inline with text;
   * rebuild that one span so the icon sizes with the label. */

  /* ─── Confirmations ───────────────────────────────────────────────────
   * A confirmation replaces the contents of the modal it was invoked from:
   * same frame, new heading, body and footer. It does not stack a second
   * dialog, and Cancel returns with the form state intact. */

  var CONFIRMS = {};

  function askDelete() {
    ui.modal.confirm = "delete";
    ui.modal.opener = '[data-role="delete"]';
    renderModal();
  }

  function askLoad() {
    ui.modal.confirm = "load";
    ui.modal.opener = "#cloud-load";
    renderModal();
  }

  /* The fields are checked before the confirmation opens, not after it is
   * accepted — being asked "are you sure" and then told the token is missing
   * is two steps in the wrong order. */
  function askSave() {
    if (!requireCredentials(true)) return;
    ui.modal.confirm = "save";
    ui.modal.opener = "#cloud-save";
    renderModal();
  }

  function cancelConfirm() {
    var opener = ui.modal.opener;
    ui.modal.confirm = null;
    ui.modal.focus = opener;
    renderModal();
  }

  CONFIRMS.delete = function () {
    var book = bookById(ui.modal.bookId);

    return {
      title: "Delete book?",
      body: [
        el("p", { class: "confirm__body" },
          el("strong", { text: book.title }),
          " by " + book.author + " will be removed from your shelf, along with its notes."
        ),
        el("p", { class: "body-sm confirm__note", text: "This cannot be undone." })
      ],
      actions: [
        el("button", { type: "button", class: "btn btn--secondary", onclick: cancelConfirm }, "Cancel"),
        /* The one red button in the app: an outline, never a fill, and it
         * names what it destroys. */
        el("button", {
          type: "button",
          class: "btn btn--danger",
          onclick: function () { deleteBook(book.id); }
        }, "Delete book")
      ]
    };
  };

  CONFIRMS.load = function () {
    var saved = read(KEYS.lastSaved, "");
    var n = state.books.length;

    return {
      title: "Replace your shelf?",
      body: [
        el("p", { class: "confirm__body" },
          "The ",
          el("strong", { text: n + (n === 1 ? " book" : " books") }),
          " on this device will be replaced by whatever is saved in the gist."
        ),
        el("p", { class: "body-sm confirm__note", text: "Anything you have changed here since the last save will be lost." }),
        saved
          ? el("div", { class: "panel panel--row" },
              el("span", { class: "body-sm", text: "Last saved" }),
              el("span", { class: "code", text: saved })
            )
          : null
      ],
      actions: [
        el("button", { type: "button", class: "btn btn--secondary", onclick: cancelConfirm }, "Cancel"),
        /* Destructive to local state, but it is the user's own saved data —
         * the system keeps `danger` for the delete case. */
        el("button", { type: "button", class: "btn btn--primary", onclick: loadFromCloud }, "Replace my shelf")
      ]
    };
  };

  CONFIRMS.save = function () {
    var saved = read(KEYS.lastSaved, "");
    var n = state.books.length;

    return {
      title: "Replace the cloud copy?",
      body: [
        el("p", { class: "confirm__body" },
          "The ",
          el("strong", { text: n + (n === 1 ? " book" : " books") }),
          " on this device will replace whatever is saved in the gist."
        ),
        /* The counterpart to the delete confirmation's "This cannot be
         * undone." Here it can: a gist keeps every revision. */
        el("p", {
          class: "body-sm confirm__note",
          text: "The gist keeps its earlier revisions, so the previous copy stays recoverable on GitHub."
        }),
        saved
          ? el("div", { class: "panel panel--row" },
              el("span", { class: "body-sm", text: "Last saved" }),
              el("span", { class: "code", text: saved })
            )
          : null
      ],
      actions: [
        el("button", { type: "button", class: "btn btn--secondary", onclick: cancelConfirm }, "Cancel"),
        el("button", { type: "button", class: "btn btn--primary", onclick: saveToCloud }, "Save to cloud")
      ]
    };
  };

  function deleteBook(id) {
    state.books = state.books.filter(function (b) { return b.id !== id; });
    saveBooks();
    closeModal();
    renderFilters();
    renderLibrary();
  }

  /* ─── Gist sync ───────────────────────────────────────────────────────
   * The token goes into one Authorization header on one host and nowhere
   * else. It is never logged, and it is never put in a URL. */

  var API = "https://api.github.com/gists/";

  function headers(token) {
    var h = {
      Accept: "application/vnd.github+json",
      "X-GitHub-Api-Version": "2022-11-28"
    };
    if (token) h.Authorization = "Bearer " + token;
    return h;
  }

  function stamp(date) {
    function pad(n) { return String(n).padStart(2, "0"); }
    return (
      date.getFullYear() + "-" + pad(date.getMonth() + 1) + "-" + pad(date.getDate()) +
      " " + pad(date.getHours()) + ":" + pad(date.getMinutes())
    );
  }

  function setStatus(text, tone) {
    ui.modal.status = text ? { text: text, tone: tone || "ink" } : null;
    renderModal();
  }

  function requireCredentials(needToken) {
    var m = ui.modal;
    var d = m.draft;
    m.invalid = { gistId: !d.gistId, token: needToken && !d.token };
    if (m.invalid.gistId || m.invalid.token) {
      m.focus = m.invalid.gistId ? "#gist-id" : "#gist-token";
      renderModal();
      return false;
    }
    return true;
  }

  function explain(response) {
    if (response.status === 401) return "GitHub rejected the token. Check that it is current and has the gist scope.";
    if (response.status === 403) return "GitHub refused the request. The token may be missing the gist scope.";
    if (response.status === 404) return "No gist with that ID, or this token cannot see it. Check the ID.";
    if (response.status === 422) return "GitHub could not accept the file. Check that the gist is not deleted.";
    return "GitHub answered " + response.status + ". Try again in a moment.";
  }

  function saveToCloud() {
    ui.modal.confirm = null;
    if (!requireCredentials(true)) return;

    var m = ui.modal;
    var d = m.draft;
    var payload = { version: 1, savedAt: new Date().toISOString(), books: state.books };
    var files = {};
    files[GIST_FILE] = { content: JSON.stringify(payload, null, 2) };

    m.busy = true;
    setStatus("Saving to GitHub…", "muted");

    fetch(API + encodeURIComponent(d.gistId), {
      method: "PATCH",
      headers: Object.assign({ "Content-Type": "application/json" }, headers(d.token)),
      body: JSON.stringify({ files: files })
    })
      .then(function (res) {
        m.busy = false;
        if (!res.ok) return setStatus(explain(res));
        var when = stamp(new Date());
        write(KEYS.lastSaved, when);
        setStatus("Saved " + when + ".");
      })
      .catch(function () {
        m.busy = false;
        setStatus("Could not reach GitHub. Check your connection and try again.");
      });
  }

  function loadFromCloud() {
    ui.modal.confirm = null;
    if (!requireCredentials(false)) return;

    var m = ui.modal;
    var d = m.draft;

    m.busy = true;
    setStatus("Loading from GitHub…", "muted");

    fetch(API + encodeURIComponent(d.gistId), { headers: headers(d.token) })
      .then(function (res) {
        if (!res.ok) throw { response: res };
        return res.json();
      })
      .then(function (gist) {
        var file = pickFile(gist);
        if (!file) throw { message: "There is no JSON file in that gist. Save to it once first." };
        if (file.truncated && file.raw_url) {
          return fetch(file.raw_url).then(function (r) { return r.text(); });
        }
        return file.content;
      })
      .then(function (text) {
        var books = parseShelf(text);
        state.books = books;
        saveBooks();
        m.busy = false;
        renderFilters();
        renderLibrary();
        setStatus("Loaded " + books.length + (books.length === 1 ? " book" : " books") + " from the gist.", "muted");
      })
      .catch(function (err) {
        m.busy = false;
        if (err && err.response) return setStatus(explain(err.response));
        setStatus(
          (err && err.message) || "Could not reach GitHub. Check your connection and try again.",
          "muted"
        );
      });
  }

  function pickFile(gist) {
    var files = (gist && gist.files) || {};
    if (files[GIST_FILE]) return files[GIST_FILE];
    var names = Object.keys(files).filter(function (n) { return /\.json$/i.test(n); });
    return names.length ? files[names[0]] : null;
  }

  function parseShelf(text) {
    var data;
    try {
      data = JSON.parse(text);
    } catch (e) {
      throw { message: "That file is not valid JSON. Check what is in the gist." };
    }
    var books = Array.isArray(data) ? data : data && Array.isArray(data.books) ? data.books : null;
    if (!books) throw { message: "That file does not look like a shelf. It needs a list of books." };
    return books.map(normalise);
  }

  /* ─── Wiring ──────────────────────────────────────────────────────────── */

  function onAction(e) {
    var button = e.target.closest ? e.target.closest("[data-action]") : null;
    if (!button) return;
    var action = button.dataset.action;
    if (action === "add") openForm(null);
    else if (action === "cloud") openCloud();
    else if (action === "sort") toggleMenu();
    else if (action === "search-open") setSearchOpen(true);
    else if (action === "search-cancel") setSearchOpen(false);
    else if (action === "search-clear") {
      clearSearch();
      nodes.search.focus();
    }
  }

  function onKeydown(e) {
    if (e.key !== "Escape") return;
    if (ui.menu) {
      closeMenu();
      var button = document.getElementById("sort-button");
      if (button) button.focus();
    } else if (ui.modal) {
      closeModal();
    } else if (state.searchOpen) {
      setSearchOpen(false);
    }
  }

  function fillIcons() {
    document.querySelectorAll("[data-icon]").forEach(function (node) {
      node.prepend(icon(node.dataset.icon));
    });
  }

  function init() {
    nodes.app = document.getElementById("app");
    nodes.filters = document.getElementById("filters");
    nodes.chips = document.getElementById("chips");
    nodes.content = document.getElementById("content");
    nodes.search = document.getElementById("search");
    nodes.searchClear = document.querySelector(".search__clear");
    nodes.overlayRoot = document.getElementById("overlay-root");

    state.books = loadBooks();
    var sort = read(KEYS.sort, "added");
    state.sort = COMPARE[sort] ? sort : "added";

    fillIcons();
    nodes.app.dataset.search = "closed";

    document.addEventListener("click", onAction);
    document.addEventListener("keydown", onKeydown);

    nodes.search.addEventListener("input", function (e) {
      state.query = e.target.value;
      syncSearchClear();
      renderLibrary();
    });

    window.addEventListener("resize", function () { if (ui.menu) closeMenu(); });

    renderFilters();
    renderLibrary();
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
  else init();
})();
