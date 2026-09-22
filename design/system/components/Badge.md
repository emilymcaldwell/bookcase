# Badge

A 24px pill in the `label` style, used to mark a piece of content — status, count, category.

## Use

```html
<span class="badge">Published</span>
<span class="badge badge--neutral">Draft</span>
<span class="badge badge--solid">3</span>
```

| Class | Ground | Text | When |
| --- | --- | --- | --- |
| `badge` | `accent-soft` | `accent` | The default. Anything worth noticing. |
| `badge--neutral` | `surface-sunken` | `ink-muted` | The unremarkable case — off, inactive, unselected. |
| `badge--solid` | `accent` | `on-accent` | Counts and one-of-a-kind emphasis. Sparingly. |
| `badge--reading` `badge--read` `badge--dropped` `badge--tbr` | `status-*-soft` | `status-*` | One of a fixed set of states, where the point is telling them apart. |

## Status badges

The four status classes are the same pill with a different hue — soft ground, its own colour as text, no border. Use them only for a closed set of states shown side by side; for anything else, `badge` or `badge--neutral` is the right answer, because a fifth and sixth hue is a change to the palette.

See *Status hues* in the brand book for the values and the measurements. Two things carry over here:

- The **word** is the status. The colour is a second signal, and `badge--dropped` and `badge--read` are a red-green pair, which is the one pairing the rest of the system avoids.
- `badge--dropped` is close to `danger` — 3° apart in hue — but it is not it. It still never appears on a button, and the destructive red still belongs only to the control that deletes.

## What you provide

The text — one or two words, sentence case, no punctuation. A badge that needs a sentence is a hint, not a badge.

## Filter chips

A filter chip is a `<button>` carrying `badge badge--neutral selectable` and an `aria-pressed` attribute. Nothing swaps classes — the attribute does all of it:

```html
<button class="badge badge--neutral selectable" aria-pressed="false">Draft</button>
```

| | Ground | Text |
| --- | --- | --- |
| unselected | `surface-sunken` | `ink-muted` |
| hover | `surface-sunken-hover` | `ink` |
| selected | `accent-soft` | `accent` |

A selected chip does not restyle under the pointer — see *Selection is not hover* in the brand book. It keeps the standard focus ring.

## Rules

- Text on `accent-soft` is `accent` — 4.8:1 in light, 5.7:1 in dark. That is the tightest pair in the palette, so if the accent ever changes, measure this one before anything else. Never `ink-muted`, which is 3.8:1 there in dark.
- `badge--solid` uses `on-accent`, which flips between themes. Never hard-code white.
- No badge carries a border. The fill is the edge — `border` is only about 1.3:1 against `surface-sunken`, so a line there would read as a rendering fault.
- `radius-full`, always. A square badge is a different component.
- Status meaning must survive without colour: the word carries it. A badge never uses `danger` — that red belongs to destructive actions, not to labelling something as bad.

## Do not

- Put a badge inside a button label.
- Use `badge--solid` more than once in a view.
