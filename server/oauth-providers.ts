export type OAuthProviderId =
    | "github"
    | "gitlab"
    | "bitbucket"
    | "gitea"
    | "forgejo";

/** One OAuth app the operator registered, for one provider on one host. */
export interface OAuthApp {
    provider: OAuthProviderId;
    host: string;
    clientId: string;
    clientSecret: string;
}

export interface ProviderSpec {
    /** Hosts with their own env credentials (not an instance list). */
    defaultHost?: string;
    /** Instance hosts come from `OAUTH_<PROVIDER>_INSTANCES`. */
    instances: boolean;
    authorizePath: string;
    tokenPath: string;
    apiBase: (host: string) => string;
    scope?: string;
    pkce: boolean;
    /** Bitbucket wants the client credentials as HTTP Basic. */
    basicAuth?: boolean;
}

/**
 * Scopes are the minimum to list repos and push contents:
 * github is a GitHub App (Contents: read/write, set on the app, and the
 * user picks the repos);  * gitlab read_api (list projects) + read/write_repository + read_user;
 * gitea/forgejo write:repository + read:user; bitbucket scopes are set on
 * the OAuth consumer (Account: read, Repositories: write), not per request.
 */
export const SPECS: Record<OAuthProviderId, ProviderSpec> = {
    github: {
        defaultHost: "github.com",
        instances: false,
        authorizePath: "https://github.com/login/oauth/authorize",
        tokenPath: "https://github.com/login/oauth/access_token",
        apiBase: () => "https://api.github.com",
        // A GitHub App ignores scopes; access is the per-repo installation.
        pkce: true,
    },
    gitlab: {
        defaultHost: "gitlab.com",
        instances: true,
        authorizePath: "/oauth/authorize",
        tokenPath: "/oauth/token",
        apiBase: (host) => `https://${host}/api/v4`,
        scope: "read_api read_user read_repository write_repository",
        pkce: true,
    },
    bitbucket: {
        defaultHost: "bitbucket.org",
        instances: false,
        authorizePath: "https://bitbucket.org/site/oauth2/authorize",
        tokenPath: "https://bitbucket.org/site/oauth2/access_token",
        apiBase: () => "https://api.bitbucket.org/2.0",
        pkce: false,
        basicAuth: true,
    },
    gitea: {
        instances: true,
        authorizePath: "/login/oauth/authorize",
        tokenPath: "/login/oauth/access_token",
        apiBase: (host) => `https://${host}/api/v1`,
        scope: "write:repository read:user",
        pkce: true,
    },
    forgejo: {
        instances: true,
        authorizePath: "/login/oauth/authorize",
        tokenPath: "/login/oauth/access_token",
        apiBase: (host) => `https://${host}/api/v1`,
        scope: "write:repository read:user",
        pkce: true,
    },
};

export const PROVIDER_IDS = Object.keys(SPECS) as OAuthProviderId[];

const HOST = /^[a-z0-9]([a-z0-9.-]*[a-z0-9])?(:\d{1,5})?$/;

/** The full URL of an authorize/token endpoint for an app. */
export function endpoint(app: OAuthApp, kind: "authorize" | "token"): string {
    const spec = SPECS[app.provider];
    const path = kind === "authorize" ? spec.authorizePath : spec.tokenPath;
    return path.startsWith("/") ? `https://${app.host}${path}` : path;
}

type Env = Record<string, string | undefined>;

/**
 * Builds the app table from env. Anything without credentials is
 * simply absent.
 */
export function loadOAuthApps(env: Env): OAuthApp[] {
    const apps: OAuthApp[] = [];
    for (const provider of PROVIDER_IDS) {
        // Bitbucket support is experimental: hidden even with credentials
        // unless OAUTH_BITBUCKET_ENABLED=true.
        if (provider === "bitbucket" && env.OAUTH_BITBUCKET_ENABLED !== "true")
            continue;
        const spec = SPECS[provider];
        const key = `OAUTH_${provider.toUpperCase()}`;
        const clientId = env[`${key}_CLIENT_ID`];
        const clientSecret = env[`${key}_CLIENT_SECRET`];
        if (spec.defaultHost && clientId && clientSecret) {
            apps.push({
                provider,
                host: spec.defaultHost,
                clientId,
                clientSecret,
            });
        }
        const raw = spec.instances ? env[`${key}_INSTANCES`] : undefined;
        if (!raw) continue;
        let parsed: unknown;
        try {
            parsed = JSON.parse(raw);
        } catch {
            continue;
        }
        if (!parsed || typeof parsed !== "object") continue;
        for (const [host, cred] of Object.entries(parsed)) {
            const c = cred as { clientId?: unknown; clientSecret?: unknown };
            const h = host.toLowerCase();
            if (
                HOST.test(h) &&
                typeof c?.clientId === "string" &&
                typeof c.clientSecret === "string" &&
                c.clientId &&
                c.clientSecret &&
                !apps.some((a) => a.provider === provider && a.host === h)
            ) {
                apps.push({
                    provider,
                    host: h,
                    clientId: c.clientId,
                    clientSecret: c.clientSecret,
                });
            }
        }
    }
    return apps;
}
