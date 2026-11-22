export type GitProvider =
    | "github"
    | "gitlab"
    | "bitbucket"
    | "gitea"
    | "forgejo"
    | "generic";

export interface RemoteConfig {
    url: string;
    token: string;
    provider?: GitProvider;
}

export interface GitCredentials {
    username: string;
    password: string;
}

export class RemoteConfigError extends Error {
    constructor(message: string) {
        super(message);
        this.name = "RemoteConfigError";
    }
}

export interface ParsedRepoUrl {
    /** Normalized https URL without `.git` or trailing slash. */
    url: string;
    host: string;
    /** `owner/repo` (or `group/sub/repo`). */
    path: string;
}

export function parseRepoUrl(input: string): ParsedRepoUrl {
    const raw = input.trim();
    if (!raw) throw new RemoteConfigError("Repository URL is required.");
    if (
        /^[\w.-]+@[\w.-]+:/.test(raw) ||
        /^(ssh|git|git\+ssh):\/\//i.test(raw)
    ) {
        throw new RemoteConfigError(
            "SSH URLs are not supported. Use the https:// clone URL and an access token.",
        );
    }
    let u: URL;
    try {
        u = new URL(raw);
    } catch {
        throw new RemoteConfigError("Repository URL is not a valid URL.");
    }
    if (u.protocol !== "https:") {
        throw new RemoteConfigError(
            "Only https:// repository URLs are supported.",
        );
    }
    if (u.username || u.password) {
        throw new RemoteConfigError(
            "Remove credentials from the URL; enter the token separately.",
        );
    }
    const path = u.pathname
        .replace(/\/+$/, "")
        .replace(/\.git$/i, "")
        .replace(/^\/+/, "");
    if (path.split("/").filter(Boolean).length < 2) {
        throw new RemoteConfigError(
            "Repository URL must include owner and repo.",
        );
    }
    return { url: `https://${u.host}/${path}`, host: u.host, path };
}

export function detectProvider(host: string): GitProvider {
    const h = host.toLowerCase().replace(/:\d+$/, "");
    if (h === "github.com") return "github";
    if (h === "gitlab.com" || h.startsWith("gitlab.")) return "gitlab";
    if (h === "bitbucket.org") return "bitbucket";
    if (h === "codeberg.org" || h.startsWith("forgejo.")) return "forgejo";
    if (h === "gitea.com" || h.startsWith("gitea.")) return "gitea";
    return "generic";
}

/**
 * isomorphic-git `onAuth` credentials per provider convention. Not verified
 * against every host: GitHub and GitLab are well documented; Bitbucket's
 * `x-token-auth` only works for repository/workspace access tokens (app
 * passwords need the real username); Gitea/Forgejo accept a token as the
 * Basic username, which is assumed to hold for generic hosts too.
 */
export function authFor(config: RemoteConfig): GitCredentials {
    const provider =
        config.provider ?? detectProvider(parseRepoUrl(config.url).host);
    const { token } = config;
    switch (provider) {
        case "github":
            return { username: token, password: "x-oauth-basic" };
        case "gitlab":
            return { username: "oauth2", password: token };
        case "bitbucket":
            return { username: "x-token-auth", password: token };
        default:
            return { username: token, password: "x-oauth-basic" };
    }
}

export function corsProxyFor(origin: string): string {
    return `${origin.replace(/\/+$/, "")}/api/git-proxy`;
}
