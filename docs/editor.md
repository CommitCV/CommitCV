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

Local resumes autosave silently about a second after each change, and when the
page is hidden or the editor is left, so there is no save button or status.
A new resume joins the library on its first edit, not when it is opened. If a
local save fails, the toolbar shows "Couldn't save locally" and the next edit
retries. A draft loaded from GitHub keeps its repository and path, and only
those remote resumes show Commit Changes and the saved/unsaved status.

Resumes from a connected git repository autosave to a session branch every
30 to 60 seconds while they have unsaved changes (see [Git client](git-sync.md)).
The status reads "Unsaved changes", "Syncing…", "Autosaved 30s ago", "Sync
failed — retrying" (the edit stays local and retries with backoff) or, when
the token no longer works, "Sync stopped" with a Reconnect link to `/connect`.
Commit Changes squashes the session into one commit on the default branch.
If the repository's version of the file changed in the same place meanwhile,
a prompt offers Keep mine or Take remote.

Opening a repository file that still has an unsquashed session (from an
earlier visit or another device) shows a dialog first: Continue session,
Squash it now, Discard session or Cancel. Only one session per file is ever
active, so the committed version cannot be edited until the session is dealt
with. Continue offers any unsaved local edits next to the session as saved.
If another device pushed the session in the meantime, autosave pauses
("Sync paused") and a prompt offers Use remote version or Keep my version
(overwrite remote); nothing is overwritten without that choice. The library
and connect page mark such files "Unsaved session" (see
[Git client](git-sync.md#resuming-a-session)). Download PDF is the main export; the
menu beside it also exports JSON or standalone Typst. No export sends resume
content to a rendering service.
