import { test, expect } from "@playwright/test";

test("lists and opens a mocked GitHub resume", async ({ page }) => {
    const resume = {
        filename: "remote-resume",
        date: "01-01-26",
        schema_version: 1,
        sections: [],
    };
    const encoded = btoa(JSON.stringify(resume));
    await page.route("**/api/github/repos/acme/cv/contents", (route) =>
        route.fulfill({
            contentType: "application/json",
            body: JSON.stringify([
                { name: "remote.json", type: "file", sha: "sha" },
            ]),
        }),
    );
    await page.route(
        "**/api/github/repos/acme/cv/contents/remote.json",
        (route) =>
            route.fulfill({
                contentType: "application/json",
                body: JSON.stringify({
                    name: "remote.json",
                    type: "file",
                    sha: "sha",
                    content: encoded,
                }),
            }),
    );

    await page.goto("/");
    await page.getByLabel("GitHub repository").fill("acme/cv");
    await page.getByRole("button", { name: "Load", exact: true }).click();
    await page.getByRole("button", { name: "remote" }).click();
    await expect(page).toHaveURL(/\/editor$/);
    await expect(page.getByLabel("Resume filename")).toHaveValue(
        "remote-resume",
    );
});
