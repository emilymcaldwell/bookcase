# Design Basics

The basic rules for how things look and read: one accent colour, neutral greys, two typefaces, a 4px spacing grid, and no motion. If something isn't covered here, pick the closest existing value rather than inventing a new one.

## Principles

- **One accent.** A dusky rose does all the highlighting: primary actions, links, focus, and selection. Everything else is neutral grey.
- **Red means destructive.** The `danger` red is only for the button that actually deletes something. Never for errors, warnings or status.
- **Borders, not shadows.** Things are separated by a 1px hairline. The only shadow is for menus and popovers that float over the page.
- **Nothing moves.** No transitions or animations. State changes are instant.
- **Words carry meaning.** Colour is never the only signal; labels and wording always say what's going on.
- **Light and dark.** Every colour has a light and a dark value, paired with `light-dark()`. Follow the system setting by default and offer a theme switcher.

## Writing

- Sentence case everywhere: buttons, headings, labels, badges, table headers. No title case, no ALL CAPS.
- Name the action: "Save changes", "Delete workspace", "Add member". Never "OK", "Submit" or "Confirm".
- Errors say what happened and what to do: "That doesn't look like an email address", not "Invalid input".
- No emoji in product UI.

## Colour

| Token | Use it for |
| --- | --- |
| `surface` | The page background. |
| `surface-raised` | Things sitting on the page: cards, inputs, menus. |
| `surface-sunken` | Set-apart areas: code blocks, empty states, table headers, tracks. A step darker than the page in light mode, a step lighter in dark. |
| `border` | Every hairline and control outline, 1px. |
| `ink` | Body text and headings. |
| `ink-muted` | Labels, hints, secondary text, placeholders. |
| `accent` | Primary buttons, links, focus rings, selected items. |
| `accent-soft` | The background of something selected, and badges. |
| `on-accent` | Text and icons on an `accent` fill. |
| `danger` | Destructive buttons only, as outline and text, never a fill. |
| `danger-soft` | The hover background of a danger button. Nothing else. |
| `backdrop` | The dimmed layer behind a modal. |

Greys are true neutral, with no warm or cool tint. Hover and pressed states are the same colour moved a step toward `ink` (darker in light mode, lighter in dark), not a new colour. The one exception is the danger button, which hovers to `danger-soft`.

**Safe text pairings**

- `ink` on any surface or on `accent-soft`.
- `ink-muted` on any surface, but never on `accent-soft`.
- `accent` on any surface or on `accent-soft`. Rose on soft rose is the tightest pair, so check it first if the accent ever changes.
- `on-accent` on `accent`. It's white in light mode and near-black in dark, so never hard-code white.

`border` is deliberately faint, so a bare input doesn't identify itself by its outline alone. Always give inputs a visible label and keep the focus ring.

### Optional colours

Seven hues, one for each colour of the rainbow, each paired with a soft tint the way `accent` pairs with `accent-soft`. They are **not part of the base palette**: nothing in the system uses them, and most apps never will. An app opts in only to tell categories apart, the way the shelf app colours its status pills, and says so in its own spec.

| Token | Soft partner |
| --- | --- |
| `red` | `red-soft` |
| `orange` | `orange-soft` |
| `yellow` | `yellow-soft` |
| `green` | `green-soft` |
| `blue` | `blue-soft` |
| `indigo` | `indigo-soft` |
| `violet` | `violet-soft` |

- The word still carries the meaning. A coloured pill is labelled, always.
- Categories only. Never for hover, selection, focus, links or the destructive button; those stay `accent` and `danger`.
- `red` is a category colour, not a warning. Don't put it on a status that reads as an error or a failure; `danger` keeps that job, and the rule that red means destructive still holds.
- Every hue passes 4.5:1 on its own soft tint and on every surface, in both schemes. The hue on its tint is the pair to use; don't mix hues and tints.

### Light and dark

Every colour token is declared once, as a `light-dark()` pair of its two values:

```css
:root { color-scheme: light dark; }
--surface: light-dark(#f7f7f7, #111111);
```

- Don't write separate `[data-theme="dark"]` blocks or `@media (prefers-color-scheme)` queries for colours.
- To follow the system, leave `color-scheme: light dark`. To force a theme, set `color-scheme` to `light` or `dark` (on the page or any section of it).
- `shadow-overlay` has several layers, so wrap each layer's colour in `light-dark()` rather than the whole shadow.

### Theme switcher

- **Two stops.** From System, one press switches to the opposite of what the operating system is showing; the next press returns to System. There's no third option.
- **How it applies:** System leaves `color-scheme: light dark` on the page. The forced choice sets `color-scheme: light` or `dark` on `<html>`, and `light-dark()` does the rest.
- **Remember the choice.** Save the forced setting in the browser and apply it in a small inline script at the top of `<head>`, before any stylesheet, so the page never flashes the wrong theme. If saving isn't possible, the switch still works for the session.
- **If the system changes** while on System, follow it.
- **Label it by state.** The button is an icon button like the rest of the header's icons: no text, no fill, no border. The icon shows the current setting (System, Light or Dark), and the accessible label names that setting and what the next press will do.
- **Instant, no animation.** Put it at the end of the header navigation.

## Type

Two typefaces: **Switzer** for everything, **Commit Mono** for code and values. Only two weights: 400 regular and 600 for headings and labels.

| Style | Size / line height | Use |
| --- | --- | --- |
| `h1` | 32/36, up to 48 on large screens | Page title, one per page. |
| `h2` | 24/30, 28 on desktop | Section heading. |
| `h3` | 18/24 | Card and subsection heading. |
| `body-lg` | 18/28 | One intro paragraph. |
| `body` | 16/24 | All running text and inputs. |
| `body-sm` | 14/20 | Table cells, hints, button labels. |
| `label` | 12/16, semibold | Field labels, badges, table headers. |
| `code` | 14/20 mono | Code, and values in tables. |
| `code-sm` | 12/16 mono | Timestamps and IDs next to a label. |

There's no heading below `h3`. If you need one, the page is too deep.

**When to use mono:** for anything read as a value rather than prose (dates, IDs, versions, money in a table, code). A number inside a sentence stays in the body font.

## Spacing, radius and layout

**Spacing** is a 4px grid: 4, 8, 12, 16, 24, 32, 48, 64, 96 (`space-1` to `space-9`). Roughly, 1–3 inside a control, 4–5 between related things, 6–7 between blocks, 8–9 between sections.

**Radius** has four values, and a component keeps the same one at every size:

- `radius-sm` (4px) for checkboxes and inline code
- `radius-md` (8px) for buttons, inputs and menus
- `radius-lg` (16px) for cards, panels and modals
- `radius-full` for badges, pills and switches

**Layout** is mobile first, with two breakpoints: `bp-desktop` (768px) and `bp-desktop-lg` (1200px). Page gutters grow from 16 to 24 to 32px across them (`space-4`, `space-5`, `space-6`).

## Components

**Buttons**

- Primary (`accent` fill) is the one main action on a screen. Only one per view.
- Secondary (raised, with a border) is for everything else of equal weight: Cancel, Back.
- Ghost (`accent` text, no fill) is for low-stakes or repeated actions, like row actions and toolbars.
- Icon (`ink` text, no fill, no border) is the icon-only button in a header or toolbar: sort, search, settings, the theme switcher, a close cross. It is not a ghost button; a row of rose icons would read as a row of links. Hover is the neutral step, and when it holds something open or is pressed it takes `accent-soft` with `accent` text, like any selected item. It always has an accessible label.
- Danger (`danger` outline and text) is only the button that actually deletes. The button that *opens* a confirmation is an ordinary secondary or ghost button. Label it with what it destroys: "Delete workspace". On hover it gains a `danger-soft` background; the border and text stay the same red.
- Three heights: 32, 40, 48px. Don't mix sizes in one row.

**Fields**

- A label always sits above the input. A placeholder is an example, never the label.
- Inputs use 16px text, so phones don't zoom in on focus.
- Errors show as a thicker `ink` border plus the error wording in the hint. Not red.

**Checkboxes, radios and switches**

- Checkbox: pick any number, applied when the form is saved.
- Radio: pick exactly one of two or more.
- Switch: takes effect immediately, no Save.
- The whole label is clickable. Stack them 16px apart.

**Cards**

- `surface-raised` with a 1px `border` and `radius-lg`, on `surface`. No shadow.
- Padding 24px, or 32px on desktop. Gaps between cards 32px.
- Never nest a card in a card. To mark a card as selected, change its border to `accent`.

**Navigation lists**

- A sidebar's filters or sections are a single-select list of full-width items in the `body` size at 600, `ink` at rest, with `radius-md`.
- Hover and selected follow the selection rules below: neutral grey for hover, `accent-soft` with `accent` text for the chosen item. A count beside the label is `ink-muted`, and takes the accent with the row when selected.

**Badges**

- A small pill in the `label` style, one or two words.
- Default is `accent` text on `accent-soft`. Neutral is `ink-muted` on `surface-sunken`. Solid (`accent` fill) is for counts, at most once per view.
- Coloured, only in an app that has opted into the optional colours, is a hue on its own soft tint: `green` on `green-soft`. It tells categories apart, nothing more.
- No borders, and never `danger`.

**Selection vs hover**

- Hover is a neutral grey highlight, a step toward `ink` from `surface-sunken`, with `ink` text: "your pointer is here".
- Selected is `accent-soft` with `accent` text: "this one is chosen".
- Never use the accent for hover on something that can also be selected, and a selected item doesn't change on hover.

**Menus and modals**

- Menus and popovers use `surface-raised`, a border, `radius-md` and `shadow-overlay`.
- Modals are a card over the `backdrop`, with no shadow.

## Icons

Outline icons drawn on a 24px grid with a 2px stroke and round ends, shown at 16 or 20px. They take the colour of the surrounding text. Pair icons with text; an icon-only button needs an accessible label.

## Files

- `tokens.css`: the tokens as CSS custom properties, colours as `light-dark()` pairs, plus the font faces. Import this in code.
- `fonts/`: Switzer (upright and italic) and Commit Mono, all variable.
- `icons/`: the outline icon set.
