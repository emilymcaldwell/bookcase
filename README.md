# Bookcase

A small personal reading tracker that syncs to a private GitHub gist. No build step, no dependencies.

## Run it

Serve the repository root with any static server so the fonts load from `design/`, then open the `shelf/` folder:

```sh
python3 -m http.server 8000
# then visit http://localhost:8000/shelf/
```

## What it does

- **Library** of books, each with a title, an author, one of four statuses (Reading, To read, Read, Dropped), a date read for finished books, a favourite mark and free-text notes.
- **Filter** by status or favourites, **search** by title or author, and **sort** by date added, title, author, status or date read.
- **Add, edit and delete** books in a modal; deleting asks first.
- **Cloud sync** to one JSON file in a GitHub gist, using a token with the `gist` scope. Saving and loading both confirm before they overwrite anything.
- **Theme switcher** that follows the system, or forces light or dark, remembered across visits.
- **Responsive**: filter pills and a floating Add button on phones, a sidebar and a table from 768px up.

## Storage

Books live in `localStorage` under `shelf.books`; the sort order, gist ID, token, last-saved time and theme choice live under their own `shelf.*` keys. The token is only ever sent in the Authorization header of a request to `api.github.com`.

## Design

Colours, type, spacing, radius and icons come from `design/tokens.css` and `design/icons/` and follow `design/README.md`: one accent, borders instead of shadows, no motion, `light-dark()` colour pairs. The app's own components and layout are in `app/shelf.css`. The behaviour spec is `design/spec.md`, and `design/wireframes/` holds the reference artboards.
