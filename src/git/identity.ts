export interface GitIdentity {
    name: string;
    email: string;
}

/** Every commit is committed by the bot; the user is only the author. */
export const COMMITTER: GitIdentity = {
    name: "CommitCV",
    email: "commit@commitcv.com",
};

export const FALLBACK_AUTHOR: GitIdentity = {
    name: "CommitCV user",
    email: "noreply@commitcv.com",
};

export function authorFor(profile?: Partial<GitIdentity>): GitIdentity {
    return {
        name: profile?.name?.trim() || FALLBACK_AUTHOR.name,
        email: profile?.email?.trim() || FALLBACK_AUTHOR.email,
    };
}

const BOT_ID = import.meta.env.VITE_GITHUB_BOT_ID;
const APP_SLUG = import.meta.env.VITE_GITHUB_APP_SLUG;

/**
 * Credited on every commit as a `Co-authored-by` trailer. With the GitHub
 * App's id and slug set, it uses the app's noreply address, which GitHub
 * links to the app's avatar and profile.
 */
export const APP_COAUTHOR: GitIdentity =
    BOT_ID && APP_SLUG
        ? {
              name: `${APP_SLUG}[bot]`,
              email: `${BOT_ID}+${APP_SLUG}[bot]@users.noreply.github.com`,
          }
        : COMMITTER;

const TRAILER = `Co-authored-by: ${APP_COAUTHOR.name} <${APP_COAUTHOR.email}>`;

export function withCoAuthor(message: string): string {
    return `${message}\n\n${TRAILER}`;
}

/** The trailer is for the host; history and session views don't show it. */
export function withoutCoAuthor(message: string): string {
    return message.trimEnd().endsWith(TRAILER)
        ? message.trimEnd().slice(0, -TRAILER.length).trimEnd()
        : message.trimEnd();
}
