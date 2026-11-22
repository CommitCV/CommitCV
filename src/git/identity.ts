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
