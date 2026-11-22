# Git client

`src/git/` is the low-level layer for syncing resumes to any https git host
with isomorphic-git. It has no UI and is not wired into the store yet.

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
