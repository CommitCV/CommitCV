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

## Git proxy

`/api/git-proxy/<host>/<repo path>/<endpoint>` is a CORS proxy for git
smart-HTTP, built for isomorphic-git's `corsProxy` option. Git hosts send no
CORS headers, so the browser cannot talk to them directly. The user's token
travels in the browser's `Authorization` header; the proxy forwards it and
nothing else about the request. It does not store tokens or resume content,
never reads the `gh_token` cookie, and logs only method, host and status of
failed requests.

Only `GET info/refs?service=git-upload-pack|git-receive-pack` and
`POST git-upload-pack|git-receive-pack` are proxied, over https on port 443.
Hosts that are IP literals, `localhost`, `*.local`, `*.internal` or
single-label names are refused. DNS is resolved once, every address must be
public (no loopback, private, link-local, CGNAT or ULA ranges), and the
connection is pinned to that answer, which defeats DNS rebinding. GET
redirects are followed up to 3 times with the same checks; the token is
dropped on a cross-host hop. Limits: 10 MB request body, 60 s to first
response byte, 120 requests per minute per client IP. Browsers may call it
only from `PUBLIC_URL` or the server's own origin.

| Variable                       | Effect                                               |
| ------------------------------ | ---------------------------------------------------- |
| `GIT_PROXY_ALLOWED_HOSTS`      | Comma-separated hosts; empty allows any public       |
| `GIT_PROXY_DISABLED`           | `1` turns the proxy off                              |
| `GIT_PROXY_DEADLINE_MS`        | Total time per request, default `300000`             |
| `GIT_PROXY_MAX_RESPONSE_BYTES` | Most bytes relayed per response, default `100000000` |

Residual risks: the rate limit is in memory, per process, and keyed on the
last `X-Forwarded-For` entry (only trustworthy behind a proxy that sets it).
The server sees tokens in transit, so run it over TLS. Without an allowlist
it can reach any public https host, so set `GIT_PROXY_ALLOWED_HOSTS` on a
public deployment.
