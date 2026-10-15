# Changelog

All notable changes to CommitCV are listed here, newest first.

## 3.0.0 — Unreleased

V3 is a ground-up rewrite on Vite, React and Tailwind CSS v4.

### Added

- Visual resume editor with sections, nested sections, per-row formatting and
  bullets. Text rows edit inline markup directly.
- Live preview and PDF export compiled in the browser with Typst WASM.
  Resume text is never sent to a rendering service.
- JSON and standalone Typst export.
- Local library backed by browser `localStorage`, with an unsaved draft that
  survives a reload.
- GitHub storage: sign in with OAuth, then save resumes as JSON files in a
  repository you choose. A save over a file that changed on GitHub is
  rejected instead of overwriting it.
- Production server that serves the app and proxies the GitHub API. The access
  token stays in an HTTP-only cookie.
- Sign out from the header while a GitHub session is active.
- Docker image, container smoke test and MkDocs documentation site.
- Unit tests (Vitest) and end-to-end tests (Playwright).
- Undo and redo from the editor toolbar or with keyboard shortcuts.
- Uploads in the old CommitCV format are converted to the current schema.
- Formatting toolbar with bold, italic, underline, bullet and link buttons.
  Styles apply to the selection, or to the whole line when nothing is
  selected. `Mod+B`, `Mod+I` and `Mod+U` work too.
- Text fields show styled text by default. A Formatted/Raw switch shows the
  inline markup instead, and the choice is remembered.
- Drag and drop to reorder sections and text rows, or to move them into
  another section. Hovering a drag over a closed section opens it.
- A layout menu on each section switches between full text, split and text
  split.
- Preview zoom by pinch, `Mod` with `+`, `-` and `0`, a typed percentage,
  preset levels, or fit to width or height. Previous and next page buttons.

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
- A section stays open or closed with the section itself when sections are
  moved or removed.
- A failed Typst start-up can be retried without reloading the page.
- A failed export shows an error instead of failing silently.
- GitHub file names containing `#` or `?` load and save the right file.
