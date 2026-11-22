import { afterEach, describe, expect, it, vi } from "vitest";

async function load(url: string) {
    vi.resetModules();
    vi.stubEnv("VITE_TEMPLATE_REPO_URL", url);
    return import("./template");
}

afterEach(() => vi.unstubAllEnvs());

describe("templateOffer", () => {
    it("offers nothing when no template is configured", async () => {
        const { templateOffer } = await load("");
        expect(templateOffer("github", "github.com")).toBeUndefined();
    });

    it("uses real templates on GitHub and Codeberg", async () => {
        const { templateOffer } = await load(
            "https://github.com/CommitCV/resume",
        );
        expect(templateOffer("github", "github.com")?.url).toBe(
            "https://github.com/CommitCV/resume/generate",
        );
        expect(templateOffer("forgejo", "codeberg.org")?.url).toBe(
            "https://codeberg.org/repo/create?template_id=2925623",
        );
        expect(templateOffer("forgejo", "git.example.org")).toBeUndefined();
    });

    it("sends GitLab and Bitbucket to import the public repo", async () => {
        const { templateOffer } = await load(
            "https://github.com/CommitCV/resume",
        );
        expect(templateOffer("gitlab", "gitlab.com")).toMatchObject({
            url: "https://gitlab.com/projects/new#import_project",
            importFrom: "https://github.com/CommitCV/resume",
        });
        expect(templateOffer("bitbucket", "bitbucket.org")).toMatchObject({
            url: "https://bitbucket.org/repo/import",
            importFrom: "https://github.com/CommitCV/resume",
        });
    });
});
