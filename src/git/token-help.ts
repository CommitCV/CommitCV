import type { GitProvider } from "./remote-config";

/** How to create an access token that can push, per provider. */
export const TOKEN_HELP: Record<GitProvider, string> = {
    github: "GitHub: Settings > Developer settings > Fine-grained tokens. Select this repository and grant Contents: Read and write.",
    gitlab: "GitLab: User settings > Access tokens (or a project access token). Select the read_repository and write_repository scopes.",
    bitbucket:
        "Bitbucket: create a repository access token with Repositories: Write. App passwords need your username and are not supported yet.",
    gitea: "Gitea: Settings > Applications > Generate token with the repository read and write permission.",
    forgejo:
        "Forgejo/Codeberg: Settings > Applications > Generate token with the repository read and write permission.",
    generic:
        "Create a personal access token on your git host with permission to read and write repository contents.",
};
