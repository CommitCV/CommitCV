import { test, expect } from "@playwright/test";

test("renders the live preview for a new resume @smoke", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("button", { name: "Start editing" }).click();
    const preview = page.getByTestId("resume-preview");
    await expect(preview).toBeVisible();
    await expect(preview.locator("svg")).toBeVisible({ timeout: 30_000 });
});

test("shows long resumes on multiple preview pages", async ({ page }) => {
    const resume = {
        filename: "long-resume",
        date: "10-04-26",
        schema_version: 1,
        sections: [
            {
                title: "Alex Reynolds",
                type: "header",
                toggled: true,
                content: [],
                subsections: [],
            },
            {
                title: "Experience",
                type: "full-text",
                toggled: true,
                content: Array.from({ length: 90 }, (_, index) => ({
                    text: `Long accomplishment ${index + 1} with enough detail to force this resume onto another page`,
                    flags: ["bullet"],
                    toggled: true,
                })),
                subsections: [],
            },
        ],
    };

    await page.goto("/");
    await page.locator('input[type="file"]').setInputFiles({
        name: "long-resume.json",
        mimeType: "application/json",
        buffer: Buffer.from(JSON.stringify(resume)),
    });
    await expect(page.getByTestId("preview-page-2")).toBeVisible({
        timeout: 30_000,
    });
    await expect(page.getByText("Page 1 of 2")).toBeVisible();
});
