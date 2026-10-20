# Resume library

`/library` lists every resume saved in this browser, reached from the header's
Resume Library link. Cards are sorted by last edit and show a first-page
preview, the filename, a local badge and "Last edited ...".

- **Open**: selecting a card loads the resume and opens the editor.
- **Download JSON / Download all**: a card downloads its resume; Download all
  saves every local resume as one `commitcv-library.json` array. It is a backup,
  not an import format; import resumes one file at a time.
- **Delete**: asks for confirmation, then removes the resume and its preview.
- **Import JSON**: reads a resume file (current or legacy CommitCV format, the
  same parser the home page uses), saves it as a new library entry and opens it.
- **New resume**: also offered when the library is empty.

Previews come from the `thumbnails` cache. A card without one shows a
placeholder while it is rendered in the background, then swaps it in.

## Backup warning

A dismissible banner says the library lives only in this browser and that
clearing site data or cache deletes it. Dismissal is remembered in
`localStorage`. Below it the page shows whether storage is protected from
automatic cleanup, offers to request that when it is not, and shows how much
storage is used. Protection does not stop manual clearing of site data, so
download files you care about.

## Version history

Local resumes keep no history. Connect a git repository to get a per-file
history with restore (see [Editor](editor.md#version-history)).
