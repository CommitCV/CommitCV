# Remote storage

Resumes are stored in any https git repository, with an access token or a
host sign-in. The git protocol goes through the proxy below; see
[Git client](git-sync.md) and
[Sign in with a git host](git-sync.md#sign-in-with-a-git-host) for setup.

The server holds no sessions and no tokens: the browser keeps its own token and
sends it only to the git host. OAuth is configured with the `OAUTH_*`
variables and `PUBLIC_URL`. Keep client secrets on the server.

## Git proxy

`/api/git-proxy/<host>/<repo path>/<endpoint>` is a CORS proxy for git
smart-HTTP, built for isomorphic-git's `corsProxy` option. Git hosts send no
CORS headers, so the browser cannot talk to them directly. The user's token
travels in the browser's `Authorization` header; the proxy forwards it and
nothing else about the request. It does not store tokens or resume content,
never reads cookies, and logs only method, host and status of
failed requests: no repository path, header or response body. With
`GIT_PROXY_TIMING=1` it also logs timings and sizes per request, naming only
the host and endpoint.

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
