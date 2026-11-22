/** The CommitCV template repo, offered for attribution. Unset hides it. */
export const TEMPLATE_REPO_URL: string | undefined =
    import.meta.env.VITE_TEMPLATE_REPO_URL || undefined;

/** The CommitCV template on Codeberg: its create page with `template_id`. */
const CODEBERG_TEMPLATE_URL: string | undefined =
    import.meta.env.VITE_CODEBERG_TEMPLATE_URL || undefined;

export interface TemplateOffer {
    url: string;
    label: string;
    /** Shown when the host has no template feature: the repo to import. */
    importFrom?: string;
    /** A reminder for the page the link opens. */
    hint?: string;
}

/**
 * Where to send a user with no repo yet so it starts from the template:
 * GitHub and Codeberg have real templates; GitLab and Bitbucket import the
 * public template repo by URL. Undefined when no template is configured.
 */
export function templateOffer(
    provider: string,
    host: string,
): TemplateOffer | undefined {
    if (!TEMPLATE_REPO_URL) return undefined;
    switch (provider) {
        case "github":
            return {
                url: `${TEMPLATE_REPO_URL}/generate`,
                label: "start from the CommitCV template",
            };
        case "forgejo":
            return host === "codeberg.org" && CODEBERG_TEMPLATE_URL
                ? {
                      url: CODEBERG_TEMPLATE_URL,
                      label: "start from the CommitCV template",
                      hint: "tick “Git Content (Default Branch)” on the next page so the resume files are copied",
                  }
                : undefined;
        case "gitlab":
            return {
                url: `https://${host}/projects/new#import_project`,
                label: "import the CommitCV template",
                importFrom: TEMPLATE_REPO_URL,
            };
        case "bitbucket":
            return {
                url: "https://bitbucket.org/repo/import",
                label: "import the CommitCV template",
                importFrom: TEMPLATE_REPO_URL,
            };
        default:
            return undefined;
    }
}
