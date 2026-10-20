# Feature: version history and restore

## Happy paths

- [list]: a git-backed resume has a History button; the panel lists squashed default-branch commits newest first with message, relative time and author, and never session commits
- [preview]: selecting a version shows its rendered preview and a summary of what restoring will change
- [restore]: "Restore this version" loads it into the editor as an unsaved edit (status "Unsaved changes", panel closes) and Ctrl+Z / Cmd+Z reverts it
- [paging]: "Load older" appears while older versions exist (shallow clone) and fetches the next page

## Edge cases

- [unsaved changes]: restoring over uncommitted edits asks first; Cancel keeps the document, "Replace my changes" restores
- [keyboard]: Escape closes the panel and focus returns to the History button
- [empty]: a file with no commits shows "No saved versions yet"
- [local]: local-only resumes have no History button

## Not covered

- Real git traffic (fake client, `seedHistory` in `fixtures/fake-git.ts`); history, deepening, deleted files and old schema versions run against a bare repo in `src/storage/git-resume-storage-history.test.ts`.
