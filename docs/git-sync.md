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
  against the previous session content) and force-pushes the branch.
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
  head when the file was loaded), latest local and pushed shas, start time.
  Resuming a session after a reload is not wired up yet.

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
