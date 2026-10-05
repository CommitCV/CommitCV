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
