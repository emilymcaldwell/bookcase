# Field

A label, a control and an optional hint stacked at `space-2`, wrapping a native `<input>` or `<textarea>`.

## Use

```html
<div class="field">
  <label class="field__label" for="email">Work email</label>
  <input class="field-input" id="email" type="email" placeholder="you@company.com">
  <span class="field__hint">We only use this for sign-in.</span>
</div>
```

`<textarea>` takes `field-area` instead — same chrome, 96px minimum, resizable vertically only.

## What you provide

A real `<label>` with `for` pointing at the control's `id`. The hint is optional; when present, also reference it with `aria-describedby`. Validation, `name`, `required` and the value are yours — the class styles, it does not validate.

## Invalid state

Set `data-invalid` on the `.field` and `aria-invalid="true"` on the control, then replace the hint text with the error:

```html
<div class="field" data-invalid>
  <input class="field-input" aria-invalid="true" aria-describedby="email-hint">
  <span class="field__hint" id="email-hint">That does not look like an email address.</span>
</div>
```

The error is carried by a **2px `ink` border and the hint's wording**, not by a red. The system does have a `danger` red, but it is reserved for destructive actions — the button that deletes. Spending it on validation would make red mean both "you typed this wrong" and "this cannot be undone", and then it means neither.

## Rules

- Labels use the `label` style in `ink-muted`; they sit above the control, never inside it. Placeholder text is an example, never the label.
- Control text is `body` (16px) — below 16px, iOS zooms the page on focus.
- `border` is a light hairline and does not, on its own, meet the 3:1 floor for identifying a control. That is why the `label` is mandatory here and the placeholder never replaces it, and why the `accent` focus ring is solid.
- Inputs use `radius-md`, the same as buttons, so a field and a button line up in a row.
- Group fields at `space-5`. Inside a field, `space-2`.
- No transitions on focus or hover.

## Do not

- Put a field on `accent-soft` — `ink-muted` labels fall below 4.5:1 there in dark.
- Use the disabled state for read-only data; use plain text, or `readonly`.
