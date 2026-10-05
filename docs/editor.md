# Editor

The editor has two synchronized surfaces:

- The left side edits the structured resume.
- The right side renders the current draft as a resume page.

All edits update the Zustand draft immediately. The preview waits briefly
after changes before compiling, so fast typing does not start a compile for
every keystroke.

## Editing sections

Sections can be enabled, renamed, reordered, removed, or extended with text.
Nested sections support the same text editing model. Whether a section is open
in the editor follows the section when it is moved or when siblings are
removed.

Each text row edits its inline markup directly: `**bold**`, `*italics*`,
`__underline__`, `~~strikethrough~~`, `[label](url)` and `$fa-icon-name$`.
Links accept `http`, `https`, `mailto` and `tel` URLs; any other scheme is
kept as plain text. The B, I and U buttons set a whole-line style, and the
bullet button marks the row as a bullet. A whole-line style is ignored when
the text already has its own inline styling.

## Saving and exporting

Save creates a local resume when the draft has no source. A draft loaded from
GitHub keeps its repository and path. Export actions produce JSON, standalone
Typst, or PDF files without sending resume content to a rendering service.
