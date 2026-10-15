# Local storage

Local resumes use browser `localStorage` under the `commitcv:resume:` key
prefix. The editor draft uses a separate key so an unsaved session can be
restored without appearing in the saved library.

Corrupt library entries are skipped when listing, but loading a selected entry
validates it and reports an error.

To remove local data, delete the saved resume from the library or clear the
site's storage in the browser. No server is needed for this workflow.
