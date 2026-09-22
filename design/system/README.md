A deliberately small system: eleven colours, one accent, one danger red, one scrim, nine spacing steps, four radii, one shadow, two typefaces, nine text styles, two breakpoints. If a decision is not in here, it is not in the system — add it here first, rather than inventing a value at the call site.

## How to load it

```html
<head>
  <script>try{var s=localStorage.getItem('ds-scheme');if(s==='light'||s==='dark')document.documentElement.setAttribute('data-theme',s)}catch(e){}</script>
  <link rel="stylesheet" href="/project/tokens.css">
  <link rel="stylesheet" href="/project/components/bundle.css">
  <script src="/project/components/bundle.js" defer></script>
</head>
<body class="ds-app">…</body>
```

Order matters. `tokens.css` carries spacing, radius, breakpoints, the type classes and `@font-face`; `bundle.css` then redeclares the eleven colour tokens as `light-dark()` pairs and adds the components. Put the inline snippet first, before any stylesheet, or a forced page flashes the other scheme.

## Content

Write in sentence case everywhere — buttons, headings, labels, badges, table headers. No title case, no ALL CAPS.

Name the action, not the mechanism: "Save changes", "Delete workspace", "Add member" — never "OK", "Submit" or "Confirm". Say "you" to the reader and "we" for the product, sparingly; prefer neither. Errors say what happened and what to do: "That does not look like an email address", not "Invalid input".

No emoji in product UI.

## Colour

Eleven tokens. There is no colour scale — depth comes from three grounds, one hairline and one accent. Two of them are not part of the palette you compose with: `danger` is a signal, and `backdrop` is a scrim.

| Token | Job |
| --- | --- |
| `surface` | The page. |
| `surface-raised` | Anything on the page: cards, inputs, menus. |
| `surface-sunken` | Anything recessed into it: code blocks, wells, tracks, empty states. |
| `border` | Every hairline and control outline, 1px. |
| `ink` | Body copy and headings. |
| `ink-muted` | Labels, hints, secondary text, placeholder. |
| `accent` | The one hue. Primary fill, links, focus ring. |
| `accent-soft` | The selected ground: badges, chosen chips, selected rows. |
| `on-accent` | Text and icons on an `accent` fill. |
| `danger` | Destructive actions only — outline and text, never a fill. |
| `backdrop` | The scrim behind a modal. The only translucent token. |

Three grounds, one step apart: `surface-sunken` recedes, `surface` is the page, `surface-raised` sits on it. In light that is #ececec / #f7f7f7 / #ffffff; in dark it inverts around the page, #050505 / #111111 / #1c1c1c, because in a dark scheme lighter reads as nearer. A sunken well is defined by its fill, never by an outline — `border` is only about 1.3:1 against it.

The greys are true neutral — equal channels, no warm or cool tint. The accent is a dusky rose: deep and slightly mauve in light (`#9b4a60`), lifted and dustier in dark (`#dd92a3`). Because the dark rose is light, `on-accent` flips: white in light, near-black in dark. **Never write `color: white` on an accent fill** — use `on-accent` and it is correct in both schemes.

It is a muted rose, not a signal red — the signal red is `danger`, below, and it is a different colour on purpose. Do not let an accent-tinted row start reading as a failure.

Pairs that are safe:

- `ink` on `surface`, `surface-raised` or `accent-soft` — 14:1 or better in both schemes.
- `ink-muted` on `surface`, `surface-raised` or `surface-sunken` — 4.8:1 or better. Not on `accent-soft`.
- `accent` as text on any of the three grounds — 5.0:1 or better in light, 7.0:1 or better in dark.
- `accent` on `accent-soft` — 4.8:1 in light, 5.7:1 in dark. This is the pairing for badges and anything else on the soft ground, and it is the tightest pair in the palette: re-measure it first if the accent ever changes.
- `on-accent` on `accent` — 5:1 or better.
- `danger` as text or as a 1px outline on any ground — 5.5:1 or better in both schemes.
- `border` is deliberately quiet — about 1.4:1 on the grounds in light, 1.6:1 in dark. It is a hairline, not a signal.

That last one is a considered trade. WCAG asks 3:1 of a line that identifies a control, and at this weight a bare input does not meet it. The system covers the gap elsewhere: **every field carries a visible `label`** (never a placeholder standing in for one), and the focus ring is a solid 2px `accent` that holds 3:1 on both grounds. Keep both of those and the lighter line costs you nothing in practice — drop either and it does.

### The danger red

`danger` is for **destructive actions and nothing else** — the button that actually deletes. Not a validation error, not a status badge, not a warning banner. A field's error is still a 2px `ink` border plus the wording, and it stays that way: the moment red means four things it stops meaning "this cannot be undone".

**It is an outline and text, never a fill.** Nothing in the system sits on top of the red, which is why there is no `on-danger` token. A destructive action should not out-shout the primary one on the same screen; an outlined red reads as a warning you have to choose, where a filled one reads as the thing to press. The hover ground is `danger-soft`, a `color-mix()` at the same 14% / 22% as `accent-soft` — a variation, not a token, because it exists for exactly one button.

The hard part is that the accent is already a rose, so the two had to be separated on purpose. They are told apart by **chroma more than hue**: `danger` sits at 0.19 against the rose's 0.11 in light, 0.18 against 0.09 in dark, only 23° apart in both. A vivid alarm red beside a dusty one. That relationship is the same in each scheme, which is what keeps a delete button from reading as a primary button.

Chroma is exactly the cue that collapses for a red-green colour-blind reader, so **the colour is never the only signal**: a destructive button names what it destroys — "Delete workspace", not "Delete" — and the red is reserved for the confirming step. The button that *opens* a confirmation is an ordinary `btn--secondary` or `btn--ghost`; only the one inside it, the one that does the deed, is red. That keeps the red rare enough to still mean something.

There is still no success or warning colour, so there is no red-green pair anywhere in the system. Adding any further signal hue is a change to the palette: do it here, with contrast checks, not in a component.

### Status hues

Four category colours, each with a `-soft` ground, for marking which of a fixed set of states a thing is in. They are the one place the palette carries more than a single accent, and they earn it by being a **category, not an emphasis**: four of them sit in one column and have to be told apart at a glance, which is the job neither `accent` nor `badge--neutral` can do.

| Token | Light | Dark | Soft light | Soft dark | Hue on its soft |
| --- | --- | --- | --- | --- | --- |
| `status-reading` | #006e99 | #6cb1d8 | #dfeaf1 | #1f272c | 4.7:1 / 6.4:1 |
| `status-read` | #1e8b39 | #7dce87 | #e2efe3 | #212a22 | **3.7:1** / 7.8:1 |
| `status-dropped` | #992c1d | #db7a69 | #f3e1de | #2d201e | 6.1:1 / 5.2:1 |
| `status-tbr` | #4a3799 | #877ed6 | #e2e2f2 | #21212c | 7.1:1 / 4.5:1 |

The dark values are the light ones carried along the same path the accent already travels between schemes — lightness `+0.22`, chroma `×0.84`, hue held — so the four read as one family with the rest of the palette rather than as four imported colours.

The soft grounds are mixed like `accent-soft`, but at **14% in light and 16% in dark**, not 22%. At 22% the violet drops to 4.19:1 against its own ground; 16% is the deepest tint at which all four clear 4.5:1.

**`status-read` does not meet the 4.5:1 floor in light** — it is 3.7:1 on its ground, and 4.37:1 against pure white, which is the most any tint could give it. It is carried deliberately. If that matters later, darkening it to `#007a2a` clears the floor at 4.51:1 and is visually the same green.

Two rules come with them:

- **The word carries the status, the colour is the second signal.** A badge reads "Dropped", never a bare red dot. Four hues at this chroma are not all distinguishable to every reader, and `status-dropped` and `status-read` are a red-green pair — the one pairing the rest of the system deliberately avoids.
- **`status-dropped` is not `danger`.** It sits 3° from it in hue and only 0.147 against 0.193 in chroma, which is far closer than `accent` ever comes. Red in this system means "this cannot be undone"; on a status badge it now also means "I gave up on this book". Keep the destructive red to the button that deletes, and do not let the two meet in one row if you can help it.

### The backdrop

`backdrop` is the scrim behind a modal or a sheet, and the **only translucent value in the system** — semi-transparent black, `0.5` in light and `0.7` in dark.

The two alphas differ, but not for the reason you would expect. A black scrim barely moves a `#111111` ground at any strength: at 0.5 it becomes `#080808`, at 0.8 `#030303`, a difference of 0.03:1. What a scrim actually does is **collapse the contrast of the content behind it** — and that works in opposite directions in the two schemes. In light the ground darkens to `#7c7c7c` while the text stays dark. In dark the ground holds still while `ink` text falls to `#494949`. Same outcome, opposite mechanism, which is why the dark scrim needs to be heavier to land in the same place.

```html
<div class="backdrop"></div>
<div class="card" role="dialog" aria-modal="true">…</div>
```

`dialog::backdrop` picks up the same value, so a native `<dialog>` needs no extra CSS.

### The inert dim

Not every overlay carries a scrim. `shadow-overlay` covers the things that float over the page with nothing behind them — a menu, a popover, an autocomplete — and while one of those is open the page under it is inert without being covered. `--dim-inert` is how far that region recedes:

```html
<div class="dim-inert" inert>…the page…</div>
<div class="overlay" role="menu">…</div>
```

It is an **opacity, not a colour** — `0.4` — so one value is right in both schemes and no new ground enters the palette. The class sets `pointer-events: none` with it, but the class only makes the state visible: the `inert` attribute is what actually removes the region from the tab order, and it is yours to set.

Use one or the other, never both. Anything behind `backdrop` is already handled — the scrim collapses the contrast of what is under it, which is the same job, and stacking an opacity on top of it only makes the scrim look uneven.

**A modal panel is an ordinary `card` and takes no shadow.** `shadow-overlay` is for things that float with nothing behind them; here the scrim is already doing that job, and in dark a black shadow over a scrimmed ground would be invisible anyway. The panel's own `border` is what draws its edge, in both schemes — which is the only thing separating it from the scrim in dark, where the two grounds sit 1.2:1 apart.

The focus trap, the `aria-modal`, the Escape handling and the scroll lock are yours; `bundle.js` holds no modal.

### Variations

Every variation is a `color-mix()` of a token above, declared once in `bundle.css`. Mixing toward `ink` always means *more contrast against the current ground*, so one declaration is correct in both schemes:

```css
--accent-hover:   color-mix(in oklab, var(--accent) 88%, var(--ink));
--surface-hover:  color-mix(in oklab, var(--surface-raised) 93%, var(--ink));
--ink-disabled:   color-mix(in oklab, var(--ink) 38%, var(--surface));
```

Need a new shade? Add a `color-mix()` line to `bundle.css`. Do not write a hex.

**Anything on an `accent-soft` ground takes `accent` as its text colour** — badges, and anything selected. `ink` stays valid there where the content is body copy rather than a label; `ink-muted` never is.

## Scheme

Raw hex appears in exactly one place: the `--_*-l` / `--_*-d` primitives at the top of `bundle.css`. Every public colour token is a `light-dark()` of that pair, so one declaration serves both schemes and no component ever sees a media query.

```css
--surface: light-dark(var(--_surface-l), var(--_surface-d));
```

`light-dark()` resolves against the element's `color-scheme`, which the system drives from one attribute on `<html>`:

| `<html>` | `color-scheme` | Result |
| --- | --- | --- |
| no attribute | `light dark` | follows the OS |
| `data-theme="light"` | `light` | forced light |
| `data-theme="dark"` | `dark` | forced dark |

Because it resolves per element, any subtree can be pinned with `.scheme-light` or `.scheme-dark` while the rest of the page follows the attribute. Use it for a permanently dark hero, a light-only embed, or a side-by-side comparison.

Do not write `@media (prefers-color-scheme: …)` anywhere. A media query cannot see a forced scheme and will disagree with the tokens.

The `ThemeToggle` component owns the attribute and the `localStorage` key `ds-scheme`; its README has the cycle and the pre-paint snippet.

## Type

Two families, both variable and self-hosted from `fonts/`. There is no display face and no serif — headings are the body family at weight 600 with tightened tracking.

| Family | Files | Axis | Behind it |
| --- | --- | --- | --- |
| `sans` — **Switzer** | `Switzer-Variable.woff2`, `Switzer-VariableItalic.woff2` | `wght 100–900` | `system-ui` |
| `mono` — **Commit Mono** | `CommitMono.woff2` | `wght 200–700` | `ui-monospace` |

Both Switzer files are declared as `font-family: "Switzer"`, so `<em>` and `font-style: italic` pick up the real italic rather than a synthesised slant. There is no mono italic — the Commit Mono file carries an `ital` axis, but the system does not use it. Weight is continuous in both, but the system only spends **400** and **600**; do not reach for a third without adding it here. Commit Mono's default instance is 200, which is why `bundle.css` declares its range — omit that and every use renders extra-light.

Nine styles, applied as classes (`.h1`, `.body`, `.code`) from `tokens.css`.

| Style | Mobile | From `bp-desktop` | Use |
| --- | --- | --- | --- |
| `h1` | 32/36 | 40/44, then 48/52 at `bp-desktop-lg` | Page title, one per page. |
| `h2` | 24/30 | 28/34 | Section heading. |
| `h3` | 18/24 | — | Card and subsection heading. |
| `body-lg` | 18/28 | — | One intro paragraph, not a page of them. |
| `body` | 16/24 | — | All running text and every input. |
| `body-sm` | 14/20 | — | Table cells, hints, button labels. |
| `label` | 12/16 | — | Field labels, badges, table headers, meta. |
| `code` | 14/20 mono | — | Code, and data read as a value. Matches `body-sm`. |
| `code-sm` | 12/16 mono | — | Dense mono meta. Matches `label`. |

`body` is set on `.ds-app` and inherited; you rarely name it. Inputs stay at 16px so iOS does not zoom on focus. Headings below `h3` do not exist — if you need a fourth level, the page is too deep.

### When to use mono

Mono is for anything **read as a value rather than as prose**: dates, times, durations, IDs, version strings, hashes, file sizes, money and figures in a table, and of course code. The point is that these get scanned and compared, not read, and a fixed advance makes a column of them line up and a changed digit obvious.

It is *not* for numbers inside a sentence. "Events are kept for 90 days" stays in `body`; a `Retained until` cell reading `2026-12-18` goes mono. The test is whether you would ever line the value up under another one.

Swap the family with `.num`, which changes the family and nothing else:

```html
<p>Shipped <span class="num">2026-09-19 14:32 UTC</span> from <code>main@a3f9c1</code>.</p>
<input class="field-input num" value="acme-prod-01">
```

Two things make that safe. **Commit Mono's x-height is 0.540em against Switzer's 0.531em**, so mono needs no size correction — set it at the same px as the text around it and the line keeps its rhythm; the usual trick of shrinking mono by 0.9 would make it look small here. And monospaced digits are tabular by construction, so columns align with no `font-feature-settings`.

`.num` is declared **last** in `bundle.css`, on purpose. It ties on specificity with `.field-input` and `.btn`, which set a family of their own because a control does not inherit one. Move it up the file and it silently stops working on inputs.

`code`, `kbd`, `samp` and `pre` pick up the mono family on their own. Inline `code` and `kbd` take a `surface-sunken` ground at `radius-sm`; `pre` takes one at `radius-md` with `space-4` of padding — a code block is a well, which is what `surface-sunken` is for.

## Spacing

Nine steps on a 4px base: 4, 8, 12, 16, 24, 32, 48, 64, 96, as `--space-1` through `--space-9`. Every padding, gap and margin comes from here; there are no arbitrary pixel values and no negative margins.

Roughly: 1–3 inside a control, 4–5 between related elements, 6–7 between blocks, 8–9 between sections and at the page edge. The steps are close together at the bottom and far apart at the top on purpose — small adjustments need precision, large ones need obvious difference.

One derived value, for the one case a step cannot cover. `--space-safe-bottom` is the bottom padding of anything pinned to the bottom of a phone — a sheet, a pinned footer, a floating action button's clearance — and it keeps that content off the home indicator:

```css
--space-safe-bottom: max(var(--space-7), env(safe-area-inset-bottom, 0px));
```

It is a `space-7` floor raised to the device's own inset wherever that is larger. `env()` resolves to `0` on anything without an indicator, so the floor is what ships everywhere else, and the value stays on the scale on every machine that is not a phone. The page has to ask for the inset or `env()` always reads 0:

```html
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
```

It is the only spacing value that is not a literal step, and it exists because the alternative — a hard 48px at every call site — silently under-pads exactly the devices that need it most.

## Radius

Four values, `--radius-sm` 4px, `--radius-md` 8px, `--radius-lg` 16px, `--radius-full` 9999px. A component picks one and keeps it at every size: checkbox `sm`, every interactive control `md`, cards and panels `lg`, badges and pills `full`. A 32px button and a 48px button share `radius-md`; the corner does not scale.

## Shadow

One token, `--shadow-overlay`, for things that draw **over** the page without a backdrop: menus, dropdowns, popovers, tooltips, autocompletes. Use the `.overlay` class, which sets the ground, the hairline, `radius-md` and the shadow together:

```html
<div class="overlay" role="menu">…</div>
```

Two layers — a 1px contact shade and a soft 8/24 ambient one. It is heavier in dark (0.4 / 0.6 alpha against 0.05 / 0.12) because a black shadow barely reads on a near-black ground. The 1px `border` is what defines the edge in both schemes; the shadow only says "this is above".

`light-dark()` cannot wrap a multi-layer `box-shadow` — the layers' own commas would be read as its two arguments — so in `bundle.css` the scheme switch sits on each layer's colour instead. Same contract, one level down.

There is no elevation scale. A thing either floats over the page or it sits in it, and everything that sits in the page is separated by `border`. Do not put this on a card, a header, a sticky bar, an image — or a modal, which has `backdrop` doing the same work.

## Layout

Mobile first. Base styles are the phone, and there are exactly two `min-width` queries in the system:

```css
@media (min-width: 48rem)  { /* bp-desktop — small desktops, landscape tablets */ }
@media (min-width: 75rem)  { /* bp-desktop-lg — large desktops */ }
```

`.ds-container` is the only layout primitive: full width with a `space-4` gutter on mobile, capped at 60rem with a `space-6` gutter from `bp-desktop`, 72rem and `space-7` at `bp-desktop-lg`. Everything inside it is flex or grid at a spacing step.

Use `rem` in the queries so a person's browser font size moves the breakpoints with it. Never add a third breakpoint for one component — use `flex-wrap`, `minmax()` or a container query instead.

## States and motion

### Selection is not hover

These are two different signals and they never share a ground:

| State | Ground | Text | Says |
| --- | --- | --- | --- |
| hover | `surface-sunken-hover` | `ink` | your pointer is here |
| selected | `accent-soft` | `accent` | this one is chosen |

**The accent belongs to selection** on anything that has both states. Spend it on their hover and the two become indistinguishable the moment the pointer moves — you can no longer tell which filter is on from which one you happen to be over.

The hover ground is `surface-sunken` taken one step deeper, because a neutral badge already rests on plain `surface-sunken`; hovering to the same value would change nothing but the text.

Use the `.selectable` class, which keys off the ARIA that has to be there anyway, so the look cannot drift from what a screen reader is told:

```html
<button class="badge badge--neutral selectable" aria-pressed="true">Published</button>
<li class="selectable" role="option" aria-selected="false">Frankfurt</li>
```

`aria-pressed="true"`, `aria-selected="true"` or a plain `data-selected` all select. It works for filter chips, list and menu options, table rows, nav items — anything with an on state.

**A selected item does not change under the pointer.** Selection outranks hover, and there is no deepened variant of `accent-soft` to hover into: mixing it one step toward `ink` drops `accent` text on it to 4.0:1 in light, under the floor. The ground is already carrying the message.

### Everything else

Hover and active are `color-mix()` variations, never a new token. A raised control — `btn--secondary`, the theme toggle — darkens its own fill with `surface-hover` rather than swapping ground. `btn--ghost` is the one exception to the rule above: it hovers to `accent-soft` and presses to `accent-soft-hover`. That is safe because a ghost button is never *selected*, so there is no second state for the accent to be confused with — the rule guards against ambiguity, and here there is none. Its pressed text drops to `accent-active`: plain `accent` on `accent-soft-hover` measures 4.0:1 in light. Focus is `2px solid var(--accent)` at `2px` offset on `:focus-visible`, on every interactive element; it is never removed, and it is solid so it holds 3:1 on both grounds. Disabled is `ink-disabled` text on no fill with a `border-disabled` outline, and it is a last resort — an enabled control with an explanation is almost always better.

Separation is borders, not shadows — with one exception, `shadow-overlay`, for things that float over the page. There is no elevation model.

**Nothing in this system transitions or animates.** `bundle.css` enforces it globally. State changes land on the frame they happen. If a future component seems to need motion, it needs a different affordance.

## Iconography

Icons are outline, drawn on a **24 viewBox at `stroke-width: 2`**, with `fill="none"`, round caps and round joins. That is the authoring size, not the display size: an icon is *drawn* at 24 and *displayed* at 16 or 20, and the stroke scales with it. Do not redraw a glyph at a smaller viewBox to keep the stroke at 2 — the box scales, the number stays.

The `Icons` asset group holds the set. The three scheme glyphs inside `ThemeToggle` are drawn inline in `bundle.js` to the same convention, so nothing in the system is authored two ways.

Every icon carries `stroke="currentColor"`, so inlined as `<svg>` it takes the colour of the text around it and needs no per-theme handling. Icons are decorative by default: `aria-hidden="true"`, with the meaning in adjacent text. An icon-only control needs `aria-label`.

One consequence of `currentColor`: an icon referenced with `<img src>` cannot inherit anything and will render black in both schemes. Inline the SVG wherever the colour matters — which is everywhere in product UI.

## Components

Six, all CSS classes over native HTML: `Button`, `Field`, `Checkbox` (checkbox, radio and switch), `Card`, `Badge`, `ThemeToggle`. There is no framework — `bundle.js` exists only to hold the scheme state that CSS cannot. Each component's README states what the consumer provides and what not to do.

When you add one: give it a class, build it on the native element, give it the tokens above, add a preview that renders once and follows the page's scheme, and write the README before the CSS.
