# Local storage

Local resumes live in the browser's IndexedDB (database `commitcv`, store
`resumes`), along with when each was last saved. IndexedDB has far more room
than `localStorage`, which matters once thumbnails and history are stored. The
editor draft uses a separate `localStorage` key so an unsaved session can be
restored without appearing in the saved library.

Each resume is stored gzipped (`CompressionStream`), about a third of its JSON
size, with its filename, date and last-saved time kept beside it so the library
lists without decompressing anything. Records saved uncompressed by earlier
builds still load and are compressed the next time they are saved. Saves and
removals run in order, and a read waits for any that are in flight.

Resumes saved by earlier versions in `localStorage` under the `commitcv:resume:`
prefix are moved into IndexedDB the first time the library is read, and removed
from `localStorage` once copied. An entry that can't be read stays where it is.

Local resumes are saved automatically a second after each change, and again
when the page is hidden or the editor is left; the commit UI is only for remote
sources. An unedited new resume is never written. The editor draft still covers
a reload that interrupts a pending save.

Loading a selected entry validates it and reports an error if it is corrupt.

To remove local data, delete the saved resume from the library or clear the
site's storage in the browser. No server is needed for this workflow.

## Keeping the library

When a local resume is saved (including by autosave), CommitCV asks the browser for persistent storage
(`navigator.storage.persist()`). A persisted origin is not evicted when disk
space runs low. Chrome decides this from signals such as the site being
installed or bookmarked, and Firefox may show a prompt; Safari behaves
differently, so the request can be refused.

Persistence only guards against automatic eviction. Clearing site data from the
browser's settings can still remove the library, so download backups of
resumes you care about, or connect a git repository.

## Thumbnails

Each local resume has a small first-page preview in a second IndexedDB store,
`thumbnails`, for the library page. It is keyed by the resume id and tagged with
a SHA-256 hash of the resume's content, so it is only re-rendered when the
content changes. Generation runs in the background after a save, when the
browser is idle, and is queued behind the live preview so typing never waits on
it. Previews are WebP at quality 0.8 (about a third the size of PNG), or JPEG in
a browser that can't encode WebP. Existing PNG previews stay until the resume
changes. A failed render is skipped and retried on the next save. Deleting a resume
deletes its thumbnail.

The [library page](library.md) shows these previews, the storage protection
status and the backup options.
