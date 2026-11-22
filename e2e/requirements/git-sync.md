# Feature: git session sync

## Happy paths

- [autosave]: after an edit and the ~30s debounce, the document is committed to a `commitcv/<slug>-<id>` session branch and the status reads "Autosaved Ns ago"
- [commit]: Commit Changes squashes the session into exactly one default-branch commit and deletes the session branch
- [conflict, take remote]: when the default branch changed the same part, a prompt appears and "Take remote" loads the repository version

## Edge cases

- [push floor]: a second edit never pushes sooner than 60s after the previous push
- [failed push]: a failed push shows "Sync failed — retrying", keeps the edit and succeeds on a later retry
- [conflict, keep mine]: "Keep mine" commits the local version over the newer remote one

## Not covered

- Resuming sessions: see `resume-session.md`.
- Real git traffic (fake client via `window.__commitcvGitFactory`, see `fixtures/fake-git.ts`); merge, squash and branch cleanup run against a local bare repo in the vitest suites.
- Auth failure ("Reconnect" link): covered in unit tests, since the fake cannot raise the real `GitAuthError` class.
- Time is Playwright's fake clock (`page.clock`), so no real 30s waits.
