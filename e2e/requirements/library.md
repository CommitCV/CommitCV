# Feature: library page

## Happy paths

- [list]: a saved resume appears as a card with filename, local badge, last-edited time and a preview
- [persist]: cards survive a reload
- [open]: selecting a card opens the resume in the editor
- [import]: importing a JSON file opens it in the editor and adds it to the library
- [download]: a card downloads its JSON, and Download all downloads every resume
- [delete]: deleting needs a confirm step, and cancelling keeps the resume
- [empty]: with no resumes an empty state offers a new resume
- [banner]: the backup warning can be dismissed and stays dismissed after reload
- [persistence]: the status shows protected or not, and the button requests persistence

## User interactions

- [card button]: opening uses the visible card button
- [file chooser]: import goes through the visible file input
- [header link]: the page is reached from the header's Resume Library link

## Edge cases

- [invalid import]: an invalid file shows an error and stays on the library
- [preview]: the preview may render lazily; the placeholder is a valid interim state
