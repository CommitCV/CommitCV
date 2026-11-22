import { Hono } from "hono";
import { SPECS } from "./oauth-providers.ts";
import type { OAuthApp, OAuthProviderId } from "./oauth-providers.ts";

export interface RepoSummary {
    fullName: string;
    cloneUrl: string;
    defaultBranch: string;
    private: boolean;
}

const LIST_PATH: Record<OAuthProviderId, string> = {
    github: "/user/repos?per_page=100&sort=pushed",
    gitlab: "/projects?membership=true&min_access_level=30&per_page=100&order_by=last_activity_at",
    bitbucket: "/repositories?role=contributor&pagelen=100&sort=-updated_on",
    gitea: "/user/repos?limit=100",
    forgejo: "/user/repos?limit=100",
};

/** Maps one provider repo to our shape; the clone URL is built, not trusted. */
export function toRepo(
    provider: OAuthProviderId,
    host: string,
    raw: unknown,
): RepoSummary | undefined {
    const r = raw as Record<string, unknown>;
    const fullName =
        r.full_name ?? (provider === "gitlab" ? r.path_with_namespace : "");
    if (typeof fullName !== "string" || !fullName) return undefined;
    const branch =
        provider === "bitbucket"
            ? (r.mainbranch as { name?: string } | null)?.name
            : r.default_branch;
    const isPrivate =
        provider === "gitlab"
            ? r.visibility !== "public"
            : Boolean(r.private ?? r.is_private);
    return {
        fullName,
        cloneUrl: `https://${host}/${fullName}`,
        defaultBranch: typeof branch === "string" ? branch : "",
        private: isPrivate,
    };
}

const bearer = (header: string | undefined) =>
    header?.match(/^Bearer ([\w.~+/=-]{1,2048})$/)?.[1];

/**
 * Provider REST APIs send no CORS headers, so repo listing and template
 * generation go through here. The browser's token is forwarded only to an
 * operator-configured host and is neither stored nor logged.
 */
export function oauthRepos(options: {
    apps: OAuthApp[];
    fetchFn: typeof fetch;
    /** GitHub App slug; enables the "choose repositories" install link. */
    githubAppSlug?: string;
}): Hono {
    const { apps, fetchFn, githubAppSlug } = options;
    const installUrl = githubAppSlug
        ? `https://github.com/apps/${githubAppSlug}/installations/new`
        : undefined;
    type Headers = Record<string, string>;
    type Listed = unknown[] | "rejected" | "error";

    async function listPlain(url: string, headers: Headers): Promise<Listed> {
        const response = await fetchFn(url, { headers });
        if (response.status === 401 || response.status === 403) {
            return "rejected";
        }
        if (!response.ok) return "error";
        const json = (await response.json().catch(() => [])) as unknown;
        return Array.isArray(json)
            ? json
            : ((json as { values?: unknown[] })?.values ?? []);
    }

    /**
     * A GitHub App's user token only reaches repos the app is installed on,
     * so list those per installation instead of `/user/repos`.
     */
    async function listInstalled(
        base: string,
        headers: Headers,
    ): Promise<Listed> {
        const response = await fetchFn(
            `${base}/user/installations?per_page=100`,
            { headers },
        );
        if (response.status === 401 || response.status === 403) {
            return "rejected";
        }
        if (!response.ok) return "error";
        const data = (await response.json().catch(() => ({}))) as {
            installations?: { id?: unknown }[];
        };
        const ids = (data.installations ?? [])
            .map((i) => i.id)
            .filter((id): id is number => Number.isInteger(id))
            .slice(0, 20);
        const pages = await Promise.all(
            ids.map(async (id) => {
                const r = await fetchFn(
                    `${base}/user/installations/${id}/repositories?per_page=100`,
                    { headers },
                );
                if (!r.ok) return [];
                const j = (await r.json().catch(() => ({}))) as {
                    repositories?: unknown[];
                };
                return j.repositories ?? [];
            }),
        );
        return pages.flat();
    }

    const app = new Hono();

    app.get("/repos", async (c) => {
        const provider = c.req.query("provider");
        const host = (c.req.query("host") ?? "").toLowerCase();
        const a = apps.find((x) => x.provider === provider && x.host === host);
        if (!a) return c.json({ error: "provider not configured" }, 404);
        const token = bearer(c.req.header("authorization"));
        if (!token) return c.json({ error: "token required" }, 401);
        const headers = {
            Authorization: `Bearer ${token}`,
            Accept: "application/json",
        };
        const base = SPECS[a.provider].apiBase(a.host);
        let list: unknown[];
        try {
            const result =
                a.provider === "github"
                    ? await listInstalled(base, headers)
                    : await listPlain(base + LIST_PATH[a.provider], headers);
            if (result === "rejected") {
                return c.json({ error: "token rejected" }, 401);
            }
            if (result === "error") {
                return c.json({ error: "provider error" }, 502);
            }
            list = result;
        } catch {
            return c.json({ error: "could not reach the provider" }, 502);
        }
        const q = (c.req.query("q") ?? "").trim().toLowerCase();
        const repos = list
            .map((r) => toRepo(a.provider, a.host, r))
            .filter((r): r is RepoSummary => !!r)
            .filter((r) => !q || r.fullName.toLowerCase().includes(q))
            .slice(0, 100);
        c.header("Cache-Control", "no-store");
        return c.json({
            repos,
            ...(a.provider === "github" && installUrl && { installUrl }),
        });
    });

    return app;
}
