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

Tokens are stored only in IndexedDB (`connections` store, database version 3,
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
`IResumeStorage` over `GitClient`. Each call fetches first and drops unpushed
local commits. `save` commits to the default branch and pushes (`targetBranch()`
is the seam for session branches), `remove` commits a deletion. A save throws
`ConflictError` if the file changed remotely since it was read or last saved,
and `UnauthorizedError` on 401/403. Entries have no dates: a shallow clone
cannot say when a file last changed.

## Template repository

Set `VITE_TEMPLATE_REPO_URL` (build time, see `.env.example`) to offer "Create
from the CommitCV template" on `/connect`. It only links to the template for
fork or use-template instructions and exists for attribution. Unset, the
option is hidden.
