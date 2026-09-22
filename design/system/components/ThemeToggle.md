# ThemeToggle

A pill button that cycles the colour scheme **system → the opposite of the system → system**, and stores the forced choice in `localStorage`.

## Use

Put an empty button anywhere; `bundle.js` fills and wires it on load.

```html
<button data-ds-theme-toggle></button>
```

Icon only:

```html
<button class="theme-toggle theme-toggle--icon" data-ds-theme-toggle></button>
```

Mounting one you added later: `DS.ThemeToggle.mount(el)`.

## The model

| Stored | `<html data-theme>` | `color-scheme` | Button reads |
| --- | --- | --- | --- |
| *(nothing)* | absent | `light dark` | System |
| `"light"` | `light` | `light` | Light |
| `"dark"` | `dark` | `dark` | Dark |

There are only two stops in the cycle because there is only one thing a person wants from this control: the scheme their OS is not giving them. From `System` the button jumps straight to the opposite of the current system scheme; pressing again returns to `System`. If the OS flips while the toggle is on `System`, the page follows it and the button's next press flips the other way.

## The pre-paint snippet — required

`bundle.js` loads too late to prevent a flash. Put this inline in `<head>`, **before any stylesheet**:

```html
<script>try{var s=localStorage.getItem('ds-scheme');if(s==='light'||s==='dark')document.documentElement.setAttribute('data-theme',s)}catch(e){}</script>
```

It is also available as `DS.theme.bootSnippet` if you generate your head server-side. Without it, a viewer who forced light on a dark OS sees one dark frame first.

## What you provide

The placement — typically the header, at the end of the nav. Nothing else. If you need the state elsewhere:

```js
DS.theme.subscribe(function (s) {
  // s.forced: "light" | "dark" | null   s.system: "light" | "dark"   s.resolved: what is painted
});
```

## Rules

- The button's `aria-label` is rewritten on every change to say the current scheme and what the next press does. Do not replace it with a static label.
- Every read and write of `localStorage` is wrapped in `try`/`catch`; in a blocked-storage context the toggle still works for the session.
- `<html data-theme>` is the single source of truth for what is painted — the attribute wins over storage, so a host page that pre-paints stays authoritative.
- No transitions. The scheme changes on the same frame as the click.

## Do not

- Add a third stop to the cycle. "System" is already one of the two.
- Read `prefers-color-scheme` in your own CSS to pick token values — `light-dark()` in `bundle.css` already does it, and a media query will not honour a forced scheme.
