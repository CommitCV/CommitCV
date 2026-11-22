# Changelog

All notable changes to CommitCV are listed here, newest first.

## 3.0.0 — Unreleased

V3 is a ground-up rewrite on Vite, React and Tailwind CSS v4.

### Added

- Visual resume editor with sections, nested sections, per-row formatting and
  bullets. Text rows edit inline markup directly.
- Live preview and PDF export compiled in the browser with Typst WASM. Resume
  text is never sent to a rendering service.
- JSON and standalone Typst export.
- Library page with local resumes and, for each connected git repository, its
  resumes as cards with a live preview. Cards have an actions menu, and a
  repository can be removed from its header.
- Local library stored in IndexedDB, with gzip-compressed resumes, cached
  thumbnails and a request for persistent storage. Resumes saved by earlier
  builds in `localStorage` move over on first use. An unsaved draft survives a
  reload.
- Git sync: connect any https git repository, or sign in with GitHub, GitLab,
  Bitbucket or Codeberg, and keep resumes as JSON files in it. Tokens stay in
  your browser. Commit messages describe what changed in the resume.
- Autosave to a session branch, with a squashed commit to the default branch on
  save (`Mod+S`). Reopening a resume offers to continue a saved session, and
  warns when the session and the repository have diverged. Changes from another
  device are merged instead of overwritten, and a true conflict is reported.
- History: list earlier versions of a resume and restore one.
- A git proxy in the production server forwards git requests so the browser can
  reach hosts without CORS. It only allows public https hosts, with limits on
  body size, response size and time. It never stores tokens.
- Docker image, container smoke test and MkDocs documentation site.
- Unit tests (Vitest) and end-to-end tests (Playwright).
- Undo and redo from the editor toolbar or with keyboard shortcuts.
- Uploads in the old CommitCV format are converted to the current schema.
- Formatting toolbar with bold, italic, underline, bullet and link buttons.
  Styles apply to the selection, or to the whole line when nothing is selected.
  `Mod+B`, `Mod+I` and `Mod+U` work too.
- Text fields show styled text by default. A Formatted/Raw switch shows the
  inline markup instead, and the choice is remembered.
- Drag and drop to reorder sections and text rows, or to move them into another
  section. Hovering a drag over a closed section opens it.
- A layout menu on each section switches between full text, split and text
  split.
- Preview zoom by pinch, `Mod` with `+`, `-` and `0`, a typed percentage, preset
  levels, or fit to width or height. Previous and next page buttons.

### Changed

- Typst compiles in a Web Worker, so the editor stays responsive while the
  preview or a PDF renders.
- Section headings are edited in the section bar. Nested sections have no
  heading field, since their titles are not printed.
- Move up and Move down are in a section's right-click menu instead of arrow
  buttons.
- Add section is in the formatting toolbar and adds inside the section being
  edited.
- Export .typ and Export .json are in a menu next to Download PDF.
- Preview zoom ranges from 25% to 400%.
- Icons use Font Awesome.
- The home page follows the design mockup: an upright headline, square start and
  upload cards, and one-line feature headings.

### Security

- Links in resume text only accept `http`, `https`, `mailto` and `tel` URLs.
  Other schemes, such as `javascript:`, stay plain text in the preview, PDF and
  Typst export.

### Fixed

- Typing in a row with partial formatting no longer rewrites or drops the
  formatting.
- Text that starts with `=`, `-`, `+`, `/` or a number followed by a period no
  longer turns into a heading or list in the rendered resume.
- The `bigger` flag is kept when the text also has inline styling.
- A section stays open or closed with the section itself when sections are moved
  or removed.
- A failed Typst start-up can be retried without reloading the page.
- A failed export shows an error instead of failing silently.
- GitHub file names containing `#` or `?` load and save the right file.
- Dropping a JSON file on the home page upload box opens it in the editor.
  Before, the browser opened the file in place of the app.
