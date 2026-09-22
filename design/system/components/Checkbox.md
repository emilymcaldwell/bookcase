# Checkbox

The three native choice controls — checkbox, radio and switch — as one row class with two modifiers, so they share a hit target, a label, a hint and a focus ring.

## Use

```html
<label class="check">
  <input type="checkbox" name="mentions" checked>
  <span>Mentions</span>
</label>

<label class="check check--radio">
  <input type="radio" name="plan" value="team" checked>
  <span>Team</span>
</label>

<label class="check check--switch">
  <input type="checkbox" role="switch" name="twofa" checked>
  <span>Two-factor authentication</span>
</label>
```

With a hint, nest it inside the label's `<span>`:

```html
<span>Weekly digest<span class="check__hint">Sent Monday, 9am</span></span>
```

| Class | Control | Shape | Use it when |
| --- | --- | --- | --- |
| `check` | `input[type=checkbox]` | 20px box, `radius-sm`, tick | Any number of a set may be on, and the form has a Save. |
| `check check--radio` | `input[type=radio]` | 20px circle, `radius-full`, dot | Exactly one of a set. Two or more options, always. |
| `check check--switch` | `input[type=checkbox] role="switch"` | 44×24 track, `radius-full`, 20px thumb | The change takes effect immediately, with no Save. |

## What you provide

`name`, `checked`, and the change handler. Radios in one group share a `name`. A switch needs `role="switch"` so it is announced as on/off rather than checked/unchecked — the class styles it, the attribute names it.

The checkbox's mixed state is set in script — `input.indeterminate = true` — because HTML has no attribute for it; the box then shows a dash. Radios and switches have no mixed state.

## Rules

- All three stay real inputs: `appearance: none` restyles them, so Space, Tab, arrow keys between radios, form submission and screen readers keep working. Never rebuild one from a `<div>`.
- The whole `<label>` is the hit target. Do not put a separate `<label for>` outside it.
- The tick, the dot and the switch's knob when on are `on-accent` on an `accent` fill, so they flip between themes.
- **Off, the switch is a filled `border` track with a light knob**, not an outlined empty one. A filled pill at 1.2:1 against the page still reads where a 1px line at the same ratio would not — area carries what a hairline cannot. The knob is `--switch-knob`, the lightest value each scheme holds: white in light, `ink` in dark. It is deliberately neither `on-accent` nor `surface-raised`, both of which go near-black in dark and would put a dark dot on a dark-grey track.
- The mark is 20px in all three: the checkbox box, the radio circle and the switch thumb. The switch's track is 44×24 — taller than the other two so the thumb has somewhere to sit, and exactly the `body` line-height, so it centres on its label with no nudge.
- Stack them at `space-4`, indent children by `space-6`.
- A disabled control drops to `border-disabled` rather than `accent` — a disabled control should not look like the primary action.
- No transitions. The box fills and the switch thumb jumps on the frame of the click; a switch that slides is not in this system.

## Do not

- Use a switch for something that only applies when the form is saved, or a checkbox for something that applies at once — that is the whole distinction.
- Use a radio for a two-state choice you could phrase as one checkbox.
- Use a single radio, or a radio group where nothing is selected by default and no option means "none".
- Use the checkbox's mixed state for "unknown". It means "some children are on".
