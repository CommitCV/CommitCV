# Remote storage

GitHub storage saves each resume as a JSON file in a repository. The browser
calls the CommitCV server, which forwards authenticated requests to GitHub.
The GitHub access token remains in an HTTP-only cookie.

The adapter remembers the last GitHub blob SHA for each opened file. A save
with a stale SHA is rejected instead of overwriting a newer commit. The adapter
can also list a file's commits and load an older revision, but the editor does
not expose either yet.

The header shows **Sign out** while a GitHub session is active. It clears the
token cookie on the server.

Configure OAuth with `GITHUB_CLIENT_ID`, `GITHUB_CLIENT_SECRET`, and
`PUBLIC_URL`. Keep the client secret on the server.
