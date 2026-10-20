# Local storage

Local resumes live in the browser's IndexedDB (database `commitcv`, store
`resumes`), along with when each was last saved. IndexedDB has far more room
than `localStorage`, which matters once thumbnails and history are stored. The
editor draft uses a separate `localStorage` key so an unsaved session can be
restored without appearing in the saved library.

Resumes saved by earlier versions in `localStorage` under the `commitcv:resume:`
prefix are moved into IndexedDB the first time the library is read, and removed
from `localStorage` once copied. An entry that can't be read stays where it is.

Loading a selected entry validates it and reports an error if it is corrupt.

To remove local data, delete the saved resume from the library or clear the
site's storage in the browser. No server is needed for this workflow.
