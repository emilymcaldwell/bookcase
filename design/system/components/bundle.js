/* @ds-bundle: {"format":4,"namespace":"DS","components":[{"name":"Button"},{"name":"Field"},{"name":"Card"},{"name":"Badge"},{"name":"Checkbox"},{"name":"ThemeToggle"}]} */
/* Design System — bundle.js
 *
 * One classic script. Assigns window.DS. No framework, no imports, no network.
 * Everything visual lives in bundle.css; this file owns exactly one thing:
 * the scheme state that CSS cannot hold on its own.
 *
 * Scheme model
 *   stored = "light" | "dark" | null      (null = follow the system)
 *   cycle(): system -> opposite of system -> system
 *   The choice is written to localStorage["ds-scheme"] and mirrored onto
 *   <html data-theme>. bundle.css turns that attribute into a color-scheme,
 *   and every token resolves through light-dark().
 *
 * Apply the stored choice BEFORE first paint with the snippet in
 * DS.theme.bootSnippet (see README) — this file usually loads too late.
 */
(function (global) {
  "use strict";

  var KEY = "ds-scheme";
  var root = global.document.documentElement;
  var listeners = [];
  var mql = global.matchMedia ? global.matchMedia("(prefers-color-scheme: dark)") : null;

  function systemScheme() {
    return mql && mql.matches ? "dark" : "light";
  }

  function stored() {
    try {
      var v = global.localStorage.getItem(KEY);
      return v === "light" || v === "dark" ? v : null;
    } catch (e) {
      return null;
    }
  }

  /* What is actually painted right now. The attribute wins over storage, so a
   * host that pre-painted (boot snippet) or that pins a scheme around an
   * embedded surface stays authoritative. */
  function forcedNow() {
    var a = root.getAttribute("data-theme");
    return a === "light" || a === "dark" ? a : null;
  }

  function state() {
    var forced = forcedNow();
    return { forced: forced, system: systemScheme(), resolved: forced || systemScheme() };
  }

  function paint(forced) {
    if (forced) root.setAttribute("data-theme", forced);
    else root.removeAttribute("data-theme");
  }

  function emit() {
    var s = state();
    syncToggles(s);
    for (var i = 0; i < listeners.length; i++) {
      try { listeners[i](s); } catch (e) {}
    }
  }

  function set(value) {
    var next = value === "light" || value === "dark" ? value : null;
    try {
      if (next) global.localStorage.setItem(KEY, next);
      else global.localStorage.removeItem(KEY);
    } catch (e) {}
    paint(next);
    emit();
  }

  /* system -> opposite of system -> system */
  function cycle() {
    set(forcedNow() ? null : systemScheme() === "dark" ? "light" : "dark");
  }

  /* ── ThemeToggle ──────────────────────────────────────────────────────── */

  var LABEL = { system: "System", light: "Light", dark: "Dark" };

  function icon(name, path) {
    return (
      '<svg data-for="' + name + '" viewBox="0 0 24 24" fill="none" stroke="currentColor" ' +
      'stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' +
      path +
      "</svg>"
    );
  }

  /* All three scheme glyphs are one family, on the shared 24 viewBox and in
   * currentColor, so none of them needs per-scheme handling.
   *
   * The sun and the moon are outline at stroke-width 2, which is the system's
   * convention. The brightness mark for `system` is the one exception: it is a
   * filled path with no stroke, because a half-lit disc is the thing it has to
   * say and an outline cannot say it. */
  var TOGGLE_MARKUP =
    icon("system", '<path d="M17 3.34a10 10 0 1 1 -15 8.66l.005 -.324a10 10 0 0 1 14.995 -8.336m-9 1.732a8 8 0 0 0 4.001 14.928l-.001 -16a8 8 0 0 0 -4 1.072" fill="currentColor" stroke="none"/>') +
    icon("light", '<path d="M8 12a4 4 0 1 0 8 0a4 4 0 1 0 -8 0"/><path d="M3 12h1m8 -9v1m8 8h1m-9 8v1m-6.4 -15.4l.7 .7m12.1 -.7l-.7 .7m0 11.4l.7 .7m-12.1 -.7l-.7 .7"/>') +
    icon("dark", '<path d="M12 3c.132 0 .263 0 .393 0a7.5 7.5 0 0 0 7.92 12.446a9 9 0 1 1 -8.313 -12.454l0 .008"/>') +
    '<span class="theme-toggle__text" data-for="system">' + LABEL.system + "</span>" +
    '<span class="theme-toggle__text" data-for="light">' + LABEL.light + "</span>" +
    '<span class="theme-toggle__text" data-for="dark">' + LABEL.dark + "</span>";

  function toggles() {
    return global.document.querySelectorAll("[data-ds-theme-toggle]");
  }

  function syncToggles(s) {
    var nodes = toggles();
    var next = s.forced ? "system" : s.system === "dark" ? "light" : "dark";
    for (var i = 0; i < nodes.length; i++) {
      var el = nodes[i];
      el.setAttribute("data-state", s.forced || "system");
      el.setAttribute(
        "aria-label",
        "Colour scheme: " + (s.forced ? LABEL[s.forced] + " (forced)" : LABEL.system) +
          ". Switch to " + LABEL[next] + "."
      );
    }
  }

  /** Fill a <button> with the toggle's icons and labels, and wire it up. */
  function mountThemeToggle(el) {
    if (!el || el.getAttribute("data-ds-mounted") === "1") return el;
    el.classList.add("theme-toggle");
    el.setAttribute("data-ds-theme-toggle", "");
    el.setAttribute("data-ds-mounted", "1");
    if (el.tagName === "BUTTON" && !el.getAttribute("type")) el.setAttribute("type", "button");
    el.innerHTML = TOGGLE_MARKUP;
    syncToggles(state());
    return el;
  }

  function mount(scope) {
    var host = scope || global.document;
    var nodes = host.querySelectorAll("[data-ds-theme-toggle]");
    for (var i = 0; i < nodes.length; i++) mountThemeToggle(nodes[i]);
    return nodes.length;
  }

  /* ── Wiring ───────────────────────────────────────────────────────────── */

  global.document.addEventListener("click", function (e) {
    var t = e.target && e.target.closest ? e.target.closest("[data-ds-theme-toggle]") : null;
    if (t) cycle();
  });

  if (mql) {
    var onSystemChange = function () { if (!stored()) emit(); };
    if (mql.addEventListener) mql.addEventListener("change", onSystemChange);
    else if (mql.addListener) mql.addListener(onSystemChange);
  }

  function init() {
    if (!root.hasAttribute("data-theme")) paint(stored());
    mount();
    emit();
  }

  if (global.document.readyState === "loading") {
    global.document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }

  global.DS = {
    version: "1.0.0",
    theme: {
      get: function () { return stored(); },
      set: set,
      cycle: cycle,
      system: systemScheme,
      resolved: function () { return state().resolved; },
      state: state,
      subscribe: function (fn) {
        listeners.push(fn);
        fn(state());
        return function () {
          var i = listeners.indexOf(fn);
          if (i > -1) listeners.splice(i, 1);
        };
      },
      storageKey: KEY,
      bootSnippet:
        "try{var s=localStorage.getItem('ds-scheme');" +
        "if(s==='light'||s==='dark')document.documentElement.setAttribute('data-theme',s)}catch(e){}"
    },
    ThemeToggle: { mount: mountThemeToggle, mountAll: mount, markup: TOGGLE_MARKUP }
  };
})(window);
