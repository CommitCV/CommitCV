# Editor

The editor has two synchronized surfaces:

- The left side edits the structured resume.
- The right side renders the current draft as a resume page.

All edits update the Zustand draft immediately. The preview waits briefly
after changes before compiling, so fast typing does not start a compile for
every keystroke.

## Editing sections

Sections can be enabled, renamed, removed, or extended with text and nested
sections. Top-level sections show their heading in the section bar. Nested
sections have no heading, since the template does not print one.

Each section's layout menu switches between full text, split, and text split.
Add section in the formatting toolbar adds a section inside the one being
edited, or at the top level when nothing is focused.

Sections and text rows move by drag and drop:

| Drop on                          | Result                        |
| -------------------------------- | ----------------------------- |
| Top or bottom of a section bar   | Section lands before or after |
| Middle of a section bar          | Section or text nests inside  |
| Top or bottom half of a text row | Text lands before or after    |

Hovering a drag over a closed section opens it, and it closes again if the
drag moves away. The header always stays first. Right-clicking a section also
offers Move up and Move down. Whether a section is open follows the section
when it moves or when siblings are removed.

## Formatting text

Text is stored as inline markup: `**bold**`, `*italics*`, `__underline__`,
`~~strikethrough~~`, `[label](url)` and `$fa-icon-name$`. Links accept
`http`, `https`, `mailto` and `tel` URLs; any other scheme is kept as plain
text.

The Formatted/Raw switch picks how text fields show that markup. Formatted
fields show styled text, with each link's URL editable below the field. Raw
fields show the markup itself. The choice is remembered across reloads.

| Control                   | With a selection          | With no selection         |
| ------------------------- | ------------------------- | ------------------------- |
| Bold, Italic, Underline   | Styles the selected text  | Toggles the whole line    |
| `Mod+B`, `Mod+I`, `Mod+U` | Same as the buttons       | Same as the buttons       |
| Bullet                    | Marks the row as a bullet | Marks the row as a bullet |
| Link                      | Links the selected text   | Links the whole line      |

A caret inside styled text toggles that styled span instead of the line.
Inside a link, the Link button removes it. A whole-line style is ignored when
the text already has its own inline styling.

## Undo and redo

The Undo and Redo buttons, `Mod+Z`, and `Mod+Shift+Z` (or `Ctrl+Y`) step
through resume edits. Typing in one field within a second of the last
keystroke counts as one step. Toggles, formatting, adds, removes, and moves
are steps of their own. Undo also restores which sections were open. History
holds the last 100 steps, is cleared when another resume loads, and is not
kept across reloads. The preview's zoom and page inputs keep the browser's own
undo.

## Preview

The preview toolbar steps between pages and controls zoom. Zoom changes by
pinch, by `Mod` with `+`, `-` or `0` while the pointer is over the preview,
by typing a percentage, or from the zoom menu's presets. Fit to width and fit
to height keep the page fitted as the window resizes, until the zoom is
changed by hand.

## Saving and exporting

Save creates a local resume when the draft has no source. A draft loaded from
GitHub keeps its repository and path. Download PDF is the main export; the
menu beside it also exports JSON or standalone Typst. No export sends resume
content to a rendering service.
