# Shelf — behaviour spec

The wireframes show one frozen moment per screen. This file holds the rules
they cannot show: what a thing does, when it exists, and what happens next.
Where this file and a wireframe disagree, this file wins. Where this file and
the design system — `design/README.md` at the repository root, with its
`tokens.css`, fonts and icons — disagree, the design system wins.

## The data

One book is:

| field      | type                                        | notes                                   |
| ---------- | ------------------------------------------- | --------------------------------------- |
| `id`       | string                                      | stable, generated on add                |
| `title`    | string                                      | required                                |
| `author`   | string                                      | required                                |
| `status`   | `CR` \| `TBR` \| `R` \| `DNF`               | required, exactly one                   |
| `dateRead` | `YYYY-MM-DD` \| null                        | **only** when `status === 'R'`          |
| `favourite`| boolean                                     | default false                           |
| `notes`    | string                                      | free text, may be empty                 |
| `addedAt`  | ISO timestamp                               | never shown, used by the default sort   |

There is no progress tracking. No page counts, no percentages, no sessions, no
ratings, no shelves beyond the four statuses. Don't add fields "while you're in
there" — the whole point of the app is that it stays this small.

### Statuses

One status, four values, three different renderings:

| value | full label | desktop badge | mobile badge |
| ----- | ---------- | ------------- | ------------ |
| `CR`  | Reading    | Reading       | CR           |
| `TBR` | To read    | To read       | TBR          |
| `R`   | Read       | Read          | R            |
| `DNF` | Dropped    | Dropped       | DNF          |

The stored value is the mobile badge. The full label is used in forms, filters
and the details modal. The badge is used in the library row. The mobile badge
is the desktop badge shortened to fit a 390px row — it is not a different
status, and it carries the full label as accessible text. There are no older
spellings and no migration: a file using anything else is not a shelf this app
wrote, and an unrecognised value falls back to `TBR`.

The app opts into the design system's optional colours, so each status has a
hue, on its own soft tint and never mixed:

| value | badge colours             |
| ----- | ------------------------- |
| `CR`  | `blue` on `blue-soft`     |
| `TBR` | `violet` on `violet-soft` |
| `R`   | `green` on `green-soft`   |
| `DNF` | `red` on `red-soft`       |

The word still carries the status; the colour only makes the four easier to
tell apart in a long list. Dropped is red on purpose: it reads as "stop", and
that is the point of the status. It is the category `red`, not `danger` —
`danger` stays on the one button that deletes a book, and nothing else in the
app uses these hues. The filter chips stay neutral badges.

`dateRead` and `status` are coupled: the date field appears in a form only when
Read is selected, and disappears (and clears) when the status changes away from
Read. In the details modal the date row is simply absent for the other three.

### Formatting

- Dates render as `YYYY-MM-DD`, in Commit Mono, right-aligned in the table and
  in read-only rows. A date is data, and the system says data is mono.
- The "last saved" timestamp in the cloud modal is `YYYY-MM-DD HH:mm`, same
  treatment.
- **Caveat the wireframes hide:** a native `<input type="date">` renders in the
  browser's locale, so the edit form will show `12/03/2026` on a UK machine no
  matter what the wireframe draws. Either accept that inside the picker and
  keep ISO everywhere else, or build a text input with an ISO mask. Pick one
  deliberately; don't let it happen by accident.

## Screens

Fifteen artboards, seven states. Desktop is drawn at 1440×900, mobile at
390×844; both are illustrations of a fluid layout, not fixed sizes.

| state                 | desktop                  | mobile                                  |
| --------------------- | ------------------------ | --------------------------------------- |
| Library               | `Main`                   | `MainMobile`, `MainMobileSearch`        |
| Book details          | `BookDetails`            | `BookDetailsMobile`                     |
| Add book              | `AddBook`                | `AddBookMobile`                         |
| Edit book             | `EditBook`               | `EditBookMobile`                        |
| Cloud settings        | `CloudSettings`          | `CloudSettingsMobile`                   |
| Delete confirmation   | `DeleteConfirmSwap`      | `DeleteConfirmMobile`                   |
| Load confirmation     | `LoadConfirm`            | `LoadConfirmMobile`                     |

## Library

### Desktop

Sidebar (full height, fixed): the app title at the top, then a single-select
filter list — All books, Reading, To read, Read, Dropped — at 600 with a
regular-weight count, then a divider, then Favourites. Favourites is part of the same single-select list, not a second
axis: choosing it replaces the status filter rather than narrowing it. Add book
sits at the bottom of the sidebar as a primary button.

Topbar: search on the left (`Search by title or author`, filters as you type,
matches title and author, case-insensitive, no submit); icon buttons on the
right — sort, cloud, theme toggle — in `ink`, as icon buttons, not ghost
buttons; the sort button takes `accent-soft` and `accent` only while its
menu is open. The clear cross inside the search field is the same. Sort opens a menu with Date added (default),
Date read, Title, Author, Status; the active option's icon and label take
`accent`. Status sorts in the order the four are listed everywhere else —
Reading, To read, Read, Dropped — not alphabetically, and falls back to date
added within a group.

Table: status, title, author, date read, favourite. Header has a bottom border
and no label above the favourite column. Date read is blank unless the book is
read. The heart appears only on favourites and sits flush right.

**A row is one click target.** The whole row — including the heart — opens the
book details modal. The heart is a display-only indicator; favouriting happens
in the add/edit form, never by clicking the row. This is why the markup is a
grid of `<button>`s rather than a `<table>`: if you rebuild it as a real table,
keep the single-target behaviour and give each row one focusable control.

### Mobile

The topbar keeps its desktop height. It holds the title and two icon buttons
(search, cloud); tapping search replaces the title and icons with a focused
field and a Cancel button (`MainMobileSearch`), and Cancel restores the bar and
clears the query.

The sidebar filters become one row of pills that scrolls sideways, in the same
order, with the same single-select behaviour. These are neutral badges used as
filter chips — `badge badge--neutral selectable` with `aria-pressed`: hover is
a neutral step toward `ink`, selected is `accent-soft` with `accent` text. The
wireframe draws them as bordered white pills, which is wrong; follow the system.

Each row is badge / (title stacked over author · date read) / heart, and the
whole row is the tap target. Add book becomes a floating button, bottom right.

The breakpoint is 768px: below it, sidebar → pills, search → magnifier, modals
→ sheets.

## Modals

### Shared rules

- Backdrop is `--backdrop`. A modal over a backdrop gets **no shadow** — the
  system is explicit about this.
- Clicking the backdrop closes the modal, as does Escape and the ✕.
- Every modal traps focus, returns it to whatever opened it, and is labelled by
  its own heading.
- Desktop: centred dialog. Mobile: forms and details are **bottom sheets** —
  pinned to the bottom, rounded top corners only, max height ~92vh, body
  scrolls inside; confirmations stay **centred dialogs**, because they are
  short and shouldn't feel dismissible by swipe.

### Book details

Read-only. Title and author on the left, status badge and (if favourited) a
Favourite badge on the right. Date read appears only for read books as a
read-only row — calendar icon left, mono date right. Notes are a read-only
panel. Read-only panels are sunken fill with **no border**; the system says a
sunken well is defined by its fill.

Footer: Delete book on the left, Edit book on the right.

On mobile it is a bottom sheet. The badges move below the title and author
rather than sitting beside them — at 390px a long title and two badges cannot
share a line — and the two buttons stack full width at the end of the scrolling
content, Edit book (primary) above Delete book (`btn--danger` outline).

### Add / Edit

Same form: title, author, status (four radios), date read (only when Read),
favourite toggle, notes.

- Add: Cancel and Add book, both right-aligned. No date field until Read is
  chosen.
- Edit: same, with the primary reading Save changes, and Delete book on the
  left.
- Mobile stacks the buttons full width; Delete book sits below them, separated.

Title and author are required; everything else can be empty. A validation error
is a 2px `ink` border plus wording — **never** `danger`, which belongs only to
destructive actions.

### Cloud settings

Sync is a single JSON file in a GitHub gist. Two fields, both mono because both
are data: Gist ID (help text: the 32-character id at the end of the gist's URL)
and GitHub access token (help text: needs the gist scope, and nothing else).

The token field is `type="password"` with a ghost eye button inside the border
to reveal it. The eye is 32px on desktop; **on mobile it should be 44px** —
the wireframe reuses 32 and that is too small for a thumb. Token and gist id
live in `localStorage`; the token is never logged and never leaves the app
except in the Authorization header of a request to api.github.com.

Footer: Save to cloud and Load from cloud. A "Last saved" row shows the
timestamp of the most recent successful save.

### Confirmations

Three actions confirm: **delete a book**, **load from cloud** and **save to
cloud**. Save was originally exempt — it overwrites the gist, which is the
thing the user just asked for, and the gist keeps revisions — but both
directions of sync now ask, so neither one can go off on a mistimed click.

A confirmation **replaces the contents of the modal it was invoked from** —
same frame, same size, new heading, body and footer. It does not stack a second
dialog on top of the first, and it does not add a bar to the footer. Cancel
returns to the previous contents with all form state intact.

- Delete: heading "Delete book?", body naming the book and its author, then
  "This cannot be undone." Footer is Cancel + Delete book, where Delete book is
  `btn--danger` (outline and text, not a filled red block).
- Load: heading "Replace your shelf?", body naming the count of books that will
  be replaced, then the warning that local changes will be lost, then the last
  saved row. Footer is Cancel + Replace my shelf as the primary — this is
  destructive to local state but it is the user's own saved data, so the system
  reserves `danger` for the delete case.
- Save: heading "Replace the cloud copy?", body naming the count of books that
  will be written, then the note that the gist keeps its earlier revisions —
  the counterpart to delete's "This cannot be undone.", because here it can —
  then the last saved row. Footer is Cancel + Save to cloud as the primary.
  The gist ID and token are validated **before** the confirmation opens, not
  after it is accepted.
- Mobile stacks the two buttons full width, confirming action on top.

**Resolved:** the system says the danger style is only for the button that
actually deletes, and that the button which *opens* a confirmation is an
ordinary secondary or ghost button. So the openers (Delete book in the details
modal and in the edit form) are secondary, and `btn--danger` appears once, on
the Delete book inside the confirmation. The wireframes still draw both as
danger; the system wins.

## Theme

Light, dark and system, via the theme switcher the design system describes: an
icon button at the end of the header, styled like the other bar icons with no
text and no border, whose icon shows the state (System, Light or Dark) and
whose accessible label names that state and what the next press does, cycling
System → the opposite of the OS → System.
The default is system. A forced choice is `color-scheme` on `<html>`, saved in
`localStorage` under `shelf.theme` and re-applied by the inline script at the
top of `<head>`, before any stylesheet, or the wrong scheme flashes.

Nothing in the app reads colours from anywhere but tokens — hover and pressed
states are a token mixed a step toward `ink` — so dark mode needs no per-screen
work; if it does, that is a bug in the markup.

## Values that are not tokens

The system has no token for the padding that keeps a pinned mobile footer or a
floating button clear of the home indicator. The app adds
`env(safe-area-inset-bottom)` to the nearest spacing step there, and nowhere
else. If you need any other value that isn't a token, stop and ask.
