# Feature: sign in with a git host

## Happy paths

- [providers]: only providers the server reports as configured get a "Sign in with <Provider>" button; sign-in is hidden when none are
- [instances]: a provider with several instances (Forgejo, Gitea, GitLab) shows an instance chooser and the chosen host is sent to `/api/oauth/login`
- [return]: returning with `?signed_in=` takes the one-time handoff, cleans the URL, prefills the author name and lists repos
- [search]: the repo search filters the list; "Use" tests and saves the connection
- [secrets]: the token ends up only in the IndexedDB connection record, never in the URL, page text or localStorage

## Error cases

- [handoff]: an expired or failed handoff shows a readable message and keeps the buttons
- [denied]: `?signin_error=denied` shows a readable message
- [email]: a provider that gives no email leaves "Use" disabled until the user enters one

## Not covered

- The real OAuth redirect and code exchange: `/api/oauth/**` is route-mocked here; the flow (state, PKCE, handoff TTL, cookies) is covered by `server/oauth.test.ts` with an injected fetch.
- "Create one from the CommitCV template" link in the repo picker: needs `VITE_TEMPLATE_REPO_URL` at build time; opens the template's `/generate` page.
- Token refresh on expiry: unit tested in `src/git/oauth.test.ts`.
