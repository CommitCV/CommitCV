# Feature: connect a git repository

## Happy paths

- [connect]: a valid URL, token and author saves a connection that is listed and survives a reload
- [open]: a listed repo file opens in the editor and Commit Changes commits it (squashed from a session branch, see git-sync.md)
- [new resume]: a new resume file is created in the repo and opened
- [library]: the library page shows connected repos and their resumes
- [remove]: removing a connection needs a confirm step; cancelling keeps it

## Error cases

- [validation]: Test connection and Connect stay disabled until every required field is filled; SSH and non-https URLs show a message
- [auth/network]: an auth or network failure is shown clearly and never includes the token
- [secrets]: the token is a password field and never appears in page text, localStorage or the persisted draft

## Edge cases

- [template]: "Create from the CommitCV template" is hidden unless `VITE_TEMPLATE_REPO_URL` is set

## Not covered

- Real git traffic: the proxy only reaches public https hosts, so the git client is faked through the dev-only `window.__commitcvGitFactory` seam. Real clone, commit, push, conflict and auth behavior is covered by the vitest suites against a local bare repo.
- The template link when the variable is set (the e2e dev server runs without it).
