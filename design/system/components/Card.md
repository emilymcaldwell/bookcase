# Card

A `surface-raised` block on `surface`, separated by one `border` hairline and `radius-lg` — the system's only container.

## Use

```html
<article class="card">
  <h3 class="h3 card__title">Retention policy</h3>
  <p class="card__body">Events are kept for 90 days, then aggregated.</p>
  <div class="card__footer">
    <button class="btn btn--primary btn--sm" type="button">Edit</button>
  </div>
</article>
```

The parts are optional and unordered — `card__title`, `card__body` (drops to `ink-muted`) and `card__footer` (a `space-3` action row) are conveniences, not a required structure.

## What you provide

The heading level that fits the page outline — `card__title` sets spacing only, so pair it with `h2` or `h3`. Content, actions and any grid the cards sit in are yours.

## Rules

- Padding is `space-5` on mobile and `space-6` from `bp-desktop`. Nothing else changes with width.
- Separation is a hairline, never a shadow. There is no shadow family in this system.
- Cards sit on `surface`. A card inside a card is not a pattern here — use a `border-top` rule and `space-5` instead.
- Gaps between cards are `space-6`.
- A card that is entirely clickable becomes an `<a>` or `<button>` wrapping the content, and takes the standard focus ring. Do not attach a click handler to a `<div>`.

## Do not

- Nest a card in a card.
- Tint a card with `accent-soft` to mean "selected" — set `border-color: var(--accent)` instead, so the text contrast does not move.
