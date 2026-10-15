import { test, expect } from "@playwright/test";

test.describe("home", () => {
    test("starts a new resume @smoke", async ({ page }) => {
        await page.goto("/");
        await expect(
            page.getByRole("heading", { name: "Your resume your way" }),
        ).toBeVisible();
        await page.getByRole("button", { name: "Start editing" }).click();
        await expect(page).toHaveURL(/\/editor$/);
        await expect(page.getByLabel("Resume filename")).toHaveValue(
            "starter-resume",
        );
    });

    test("loads a JSON resume through the upload area", async ({ page }) => {
        await page.goto("/");
        await page
            .locator('input[type="file"]')
            .setInputFiles("e2e/fixtures/message-1.json");
        await expect(page).toHaveURL(/\/editor$/);
        await expect(page.getByLabel("Resume filename")).not.toHaveValue(
            "starter-resume",
        );
    });

    test("migrates a legacy CommitCV resume through the upload area", async ({
        page,
    }) => {
        const legacy = {
            header: {
                name: "Legacy Person",
                subheaders: [{ text: "legacy@example.com" }],
            },
            sections: [
                {
                    name: "Work Experience",
                    subsections: [
                        {
                            title: "Cook",
                            date: "2020",
                            bulletCollection: [
                                { bold: "Made", normal: "pancakes" },
                            ],
                        },
                    ],
                },
            ],
        };

        await page.goto("/");
        await page.locator('input[type="file"]').setInputFiles({
            name: "legacy-resume.json",
            mimeType: "application/json",
            buffer: Buffer.from(JSON.stringify(legacy)),
        });
        await expect(page).toHaveURL(/\/editor$/);
        await expect(page.getByLabel("Resume filename")).toHaveValue(
            "legacy-resume",
        );
        await expect(
            page.getByRole("button", { name: "Work Experience", exact: true }),
        ).toBeVisible();
        await expect(
            page.getByTestId("resume-preview").locator("svg"),
        ).toBeVisible({ timeout: 30_000 });
    });

    test("signs out of a GitHub session", async ({ page }) => {
        await page.route("**/api/auth/session", (route) =>
            route.fulfill({
                contentType: "application/json",
                body: JSON.stringify({ authenticated: true, login: "octocat" }),
            }),
        );
        await page.route("**/api/auth/logout", (route) =>
            route.fulfill({
                contentType: "application/json",
                body: JSON.stringify({ ok: true }),
            }),
        );
        await page.goto("/");
        await expect(page.getByRole("link", { name: "Sign In" })).toHaveCount(
            0,
        );
        await page.getByRole("button", { name: "Sign out" }).click();
        await expect(page.getByRole("link", { name: "Sign In" })).toBeVisible();
    });
});
