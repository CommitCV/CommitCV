# Feature: local library

## Happy paths

- [autosave]: editing a new resume silently creates a local library entry
- [reopen]: selecting a local entry restores it in the editor
- [delete]: deleting an entry removes it from the library
- [reload]: an edit made before a reload is still there afterwards

## User interactions

- [no commit UI]: a local resume shows no commit button or save status
- [library entry]: opening uses the visible entry rather than direct storage access

## Regression coverage

- [untouched]: a new resume that was never edited is not added to the library
