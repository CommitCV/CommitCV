# Feature: resuming an unsquashed session

## Happy paths

- [prompt]: opening a repo file that has a session branch shows a dialog (Continue session, Squash it now, Discard session, Cancel) before any editing, from the connect page and the library
- [continue]: Continue loads the session content, and later autosaves go to the same branch; Commit Changes then makes one default-branch commit and deletes it
- [local edits]: after a failed push and a reload, Continue offers "Use my unsaved local edits" or "Use session as saved"
- [discard]: Discard needs a confirm step, deletes the branch and opens the committed version
- [squash]: Squash it now needs a confirm step and makes exactly one default-branch commit
- [other device]: a session left by another client (seeded in the fake) is found and continued like a local one
- [badge]: files with a session show "Unsaved session" with the last activity age in the library and on the connect page

## Edge cases

- [no session]: a file without a session opens straight into the editor
- [cancel]: Cancel and Back leave the session untouched and do not open the editor
- [diverged, keep mine]: when the remote session branch moved, autosave pauses ("Sync paused") with a prompt; nothing is overwritten until "Keep my version (overwrite remote)"
- [diverged, use remote]: "Use remote version" loads the other device's edit

## Not covered

- "Ignore, open the committed version" is not offered: an unresolved session must be continued, squashed or discarded first.
- Several sessions for one file, the stale-default merge and conflict paths, and fast-forward rejection by a real server run against a local bare repo in the vitest suites.
- Like `git-sync.md`, git traffic is the fake in `fixtures/fake-git.ts`, which keeps its state in localStorage so it survives navigations; `seedSession` and `moveSession` stand in for another device.
