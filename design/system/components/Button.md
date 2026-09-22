# Button

A single control class with three emphasis levels and three heights, built on a native `<button>` or `<a>`.

## Use

```html
<button class="btn btn--primary" type="button">Save changes</button>
<button class="btn btn--secondary" type="button">Cancel</button>
<a class="btn btn--ghost" href="/docs">Learn more</a>
```

Always give the element a `type` — an unqualified `<button>` inside a form submits it.

## Variants

| Class | Fill | Text | When |
| --- | --- | --- | --- |
| `btn--primary` | `accent` | `on-accent` | The one action the screen exists for. One per view. |
| `btn--secondary` | `surface-raised` + `border` | `ink` | Everything else with equal weight: Cancel, Back, secondary actions. |
| `btn--ghost` | none | `accent` | Low-stakes or repeated actions — table row actions, toolbars, links that need a hit target. |
| `btn--danger` | none + `danger` | `danger` | The confirming step of a destructive action. See below. |

Sizes: `btn--sm` (32px), default (40px), `btn--lg` (48px). Pick one per surface and keep it; do not mix `btn--sm` and `btn--lg` in the same row.

## What you provide

The label, the `type`, and the handler. Labels are sentence case and name the action — "Save changes", not "OK" or "Submit". Icons go in as inline `<svg>` sized 16px; the `space-2` gap is already there.

## Rules

- `on-accent` flips between themes, so never write `color: white` on a primary button.
- Disabled uses `:disabled` or `aria-disabled="true"`; both drop to `ink-disabled` on no fill. Prefer keeping the button enabled and explaining the failure in a hint.
- Hover and active are `color-mix()` of `accent` or `surface-raised` toward `ink`, so they read as "more contrast" in both schemes. Do not add a new colour for them.
- The focus ring is `2px solid accent` at `2px` offset, on every variant. Do not remove it.
- No transitions. The state change is immediate, by design.

## The danger variant

`btn--danger` is the button that **actually destroys something** — the one inside the confirmation, not the one that opens it. The button that opens a confirm is an ordinary `btn--secondary` or `btn--ghost` labelled "Delete…".

It is an **outline**: `danger` border and `danger` text on no fill, hovering to a `danger-soft` ground with the border and text one step deeper. It is never filled — a destructive action should not out-shout the primary action on the same screen, and an outlined red reads as a warning you have to choose rather than the thing to press.

Its label names the target: **"Delete workspace"**, never a bare "Delete" or "Confirm". The colour is the second signal, not the first — `danger` is separated from `accent` by chroma, which is the cue that collapses for a red-green colour-blind reader, so the words have to carry it.

One per view, and never beside a `btn--primary`: if a screen has both a primary action and a destructive one competing, the destructive one belongs behind a confirmation.

## Do not

- Put a primary button next to another primary button.
- Use `btn--danger` for anything that is not destructive, or for a validation error.
- Use `btn--ghost` on an `accent-soft` ground — the accent text falls below 4.5:1 there in light.
- Set a custom height; use the size classes so the 4px grid holds.
