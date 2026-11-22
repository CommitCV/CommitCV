# Commit messages

Commit messages are generated from the difference between the previous and
next resume. They are deterministic: the same pair of resumes always produces
the same text, with no timestamps or locale-dependent formatting.

## Subject

Lowercase, conventional-commit style, at most 72 characters. Longer subjects
are cut to 71 characters and end with `…`.

| Change                           | Subject                                           |
| -------------------------------- | ------------------------------------------------- |
| No previous version              | `create <filename>`                               |
| Entries edited, added, removed   | `update experience: edit 2 entries, add "Acme"`   |
| Section added or removed         | `add section: Projects`, `remove section: Awards` |
| Section renamed                  | `rename section: Work -> Experience`              |
| Section toggled                  | `toggle off section: Skills`                      |
| Header changed                   | `update header`                                   |
| Sections only reordered          | `reorder sections`                                |
| Several sections changed         | `update experience, education, +2 more`           |
| Nothing recognisable (e.g. date) | `update <filename>`                               |

Up to three section names are listed; beyond that the first two are shown
followed by `+N more`. Subsection and entry changes roll up into their
top-level section. An entry counts as edited when its text, flags, or toggle
changes; entries are compared by position.

## Body

`generateCommitBody` returns one bullet per change, for example
`- experience: edited "Led team of 5" (line 2)`, capped at 20 lines (the last
reads `- ...and N more`).

## Matching sections

Sections have no stable ids, so previous and next sections are matched in two
passes:

1. Same type and same title. Duplicate titles pair up in order.
2. Remaining sections of the same type are paired by position among the
   unmatched ones, which reads as a rename.

Unmatched sections are additions or removals. Subsections use the same rules.
