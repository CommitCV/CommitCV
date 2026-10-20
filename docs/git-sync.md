# Git client

`src/git/` is the low-level layer for syncing resumes to any https git host
with isomorphic-git. The connect flow and storage adapter below build on it.

- `remote-config.ts`: `parseRepoUrl` (https only; SSH URLs and URLs with
  embedded credentials are rejected), `detectProvider`, `authFor` (per-host
  Basic credentials for the token) and `corsProxyFor` (the server's
  `/api/git-proxy`, see [Remote storage](remote-storage.md)).
- `git-client.ts`: `GitClient`, built from injected `fs`, `http`, `corsProxy`,
  credentials and author, so tests run on an in-memory fs and a local server.
- `load.ts`: `loadGit()` imports isomorphic-git and LightningFS (IndexedDB)
  on demand, so the code is a separate chunk that loads only when a remote is
  used. It also installs the `Buffer` global that isomorphic-git needs.

## Commit identity

The author is the user (name and email supplied by the caller, falling back
to `CommitCV user <noreply@commitcv.com>`). The committer is always the bot
`CommitCV <commit@commitcv.com>`, defined once in `identity.ts`.

## How it works

Clones are shallow, single-branch and have no working tree. Reads use the
object database directly (`readBlob` on a commit). `commitFile` writes the
blob, rebuilds the trees along the path and calls `commit({ tree })`, so no
index or checkout is needed. A new branch starts from the default branch
head. Pushes use isomorphic-git's fast-forward check; a rejected push throws
`GitConflictError`, 401/403 throw `GitAuthError`, transport failures throw
`GitNetworkError`. Error messages never contain the token.

## Shallow history

`log(ref, path)` sees only fetched commits. In a shallow clone the oldest
fetched commit looks like it changed every file, and older edits are missing
until `deepen(n)` fetches more. Tokens stay in the browser; the proxy only
forwards the `Authorization` header.

## Connecting a repository

`/connect` (linked from the library and home page) takes a git https URL, an
access token, the author name and email (the name is prefilled from a GitHub
sign-in when there is one) and an optional label. **Test connection** runs a
shallow `cloneOrOpen` and reports success, an auth failure or a network
failure; messages never contain the token. **Connect** tests, then saves the
connection. A saved connection's repo lists its root `.json` files; opening
one loads it into the editor, and a new resume can be created and committed
straight into the repo. The library page lists every connected repo.

Tokens are stored only in IndexedDB (`connections` store, database version 4,
shared opener in `src/storage/db.ts`). They never go in localStorage, the
persisted draft or the resume source, which is
`{ kind: "git", connectionId, path }`. Removing a connection deletes its token.

Create a token with permission to read and write repository contents:

- GitHub: fine-grained token for the repository with Contents: Read and write.
- GitLab: `read_repository` and `write_repository` scopes.
- Bitbucket: repository access token with Repositories: Write.
- Gitea, Forgejo, Codeberg: application token with repository read and write.

## Storage adapter

`GitResumeStorage` (`src/storage/git-resume-storage.ts`) implements
`IResumeStorage` over `GitClient`. Each call fetches first, drops unpushed
local commits on the default branch and runs one at a time. `remove` commits a
deletion to the default branch. Entries have no dates: a shallow clone cannot
say when a file last changed. 401/403 become `UnauthorizedError`.

## Sessions and autosave

Editing a git-backed resume happens on a session branch
`commitcv/<file-slug>-<shortid>`, one per file, so the default branch only
sees deliberate commits and history stays clean.

- **Autosave** (`src/store/git-autosave.ts`, started by the editor page):
  while the document is dirty, `saveSession` runs about 30s after the last
  change, never starting closer than 60s to the previous push, and at the
  latest 60s after the first unsaved change. It also flushes when the page is
  hidden or the editor is left. The first autosave creates the branch from
  the default head; each one commits the file (author the user, committer the
  bot, message and body from `generateCommitMessage`/`generateCommitBody`
  against the previous session content) and pushes the branch as a normal
  fast-forward. If the remote branch has commits this browser lacks, the push
  is rejected and `saveSession` throws `SessionDivergedError` (see below).
- **Failures**: the commit stays local and the next attempt only pushes. Retries
  back off 60s, 120s, then 240s (cap). An auth failure stops retrying until
  another document is loaded and the toolbar links to `/connect`.
- **Commit Changes** (`commit`, also what `save` does): exactly one commit on
  the default branch whose parent is the current default head, built with
  plumbing (`GitClient.squashToDefault`, no rebase). The message is
  `generateCommitMessage(defaultContent, final)` with the matching body. Then
  the session branch is deleted remotely and locally and the session cleared.
  Nothing to commit (content equals the default branch) just ends the session.
- **Session state** is stored in IndexedDB (`sessions` store, see
  `src/git/sessions.ts`): connection, path, branch, base sha (the default
  head when the file was loaded), latest local and pushed shas, start time,
  and `lastContent`, the document of a local commit that is not pushed yet.

## Resuming a session

A session outlives the tab: closing the browser or switching devices leaves
`commitcv/<slug>-<id>` on the remote.

- **Detect** (`findSessions(path)`, `listSessions()`): list remote branches
  under `commitcv/`, keep those whose name carries the file's slug (ids have
  no dash, so `a.json` and `a-1.json` stay apart), and read each with
  `GitClient.sessionCommits`, which fetches the branch and the default branch
  and returns the commits not in default history plus the base they branch
  from. A branch counts only if it is ahead of default and changes that file.
  Each result is `{ path, branch, headSha, baseSha, lastCommit, aheadBy,
local? }`, newest activity first; `local` is this browser's record. A local
  record whose first push failed is reported too; a record whose branch is
  gone from the remote (squashed or discarded elsewhere) is dropped.
- **Open flow** (`src/store/open-git-resume.ts`, dialog in
  `src/components/session/`, used by one hook for the connect page and the
  library): a file with a session is not loaded. A dialog offers **Continue
  session**, **Squash it now** (confirm; commits the session, or the unsaved
  local edits when there are some), **Discard session** (confirm; deletes the
  remote and local branch and the record, then opens the default version) or
  Cancel. There is no read-only "open the committed version": while a session
  exists it must be continued, squashed or discarded, so a file never has more
  than one active session. If several exist (two devices), each is listed.
- **Continue** (`inspectSession` then `resolveSession`): if this browser has
  `lastContent` newer than the remote head it asks "Use my unsaved local
  edits" or "Use session as saved". Taking the saved version resets the local
  branch to the remote one; afterwards the session record points at the
  remote head (`lastPushedSha` = head) and autosave fast-forwards the same
  branch. On a device with no record one is created from the remote branch.
- **Divergence**: if the remote head differs from our `lastPushedSha` (another
  device pushed), or an autosave push is rejected, the editor pauses autosave
  ("Sync paused") and asks "This session was updated elsewhere": **Use remote
  version** adopts their head, **Keep my version (overwrite remote)** is the
  only path that force-pushes (`saveSession(..., { force: true })`).
- **Stale sessions**: if the default branch moved, Continue still works and
  squash uses the merge and conflict path above; a conflict opens the session
  in the editor with the usual Keep mine / Take remote prompt.
- **Badges**: the library and connect file lists call `listSessions()` lazily
  per connection after the file list shows, and add "Unsaved session" with the
  last activity age. A failure only shows a note, never blocks the list.

## When the default branch moved

The base is the file at the session's base sha, "ours" is the default head and
"theirs" is the session content.

1. Default unchanged for the file: squash as is (other files may have moved;
   the commit is built on the new head, so they are kept).
2. Otherwise `mergeResume` (`src/resume/merge-resume.ts`) merges top-level
   fields one by one and sections as whole units by index. Edits to different
   sections merge.
3. If both sides touched the same field or section, or the section list
   changed shape while the other side edited it, or the base is unavailable,
   `commit` throws `ConflictError`. The session is kept and the toolbar asks:
   **Keep mine** commits the local content over the new head (`force`),
   **Take remote** discards the session and loads the default branch version.

A push rejected because the default branch moved after the fetch also surfaces
as a conflict; Keep mine then retries on the fresh head.

## Template repository

Set `VITE_TEMPLATE_REPO_URL` (build time, see `.env.example`) to offer "Create
from the CommitCV template" on `/connect`. It only links to the template for
fork or use-template instructions and exists for attribution. Unset, the
option is hidden.
