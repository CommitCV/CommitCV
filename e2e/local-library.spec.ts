import { test, expect } from "@playwright/test";

test("saves and reopens a local resume", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("button", { name: "Start editing" }).click();
    await page.getByLabel("Resume filename").fill("library-resume");
    await page
        .getByRole("button", { name: "Commit Changes", exact: true })
        .click();
    await expect(page.getByRole("status")).toContainText("Saved");

    await page.getByRole("link", { name: "CommitCV Home" }).click();
    const entry = page.getByRole("button", { name: /library-resume/ }).first();
    await expect(entry).toBeVisible();
    await entry.click();
    await expect(page).toHaveURL(/\/editor$/);
    await expect(page.getByLabel("Resume filename")).toHaveValue(
        "library-resume",
    );
});

test("deletes a local resume", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("button", { name: "Start editing" }).click();
    await page.getByLabel("Resume filename").fill("delete-me");
    await page
        .getByRole("button", { name: "Commit Changes", exact: true })
        .click();
    await page.getByRole("link", { name: "CommitCV Home" }).click();
    await page.getByRole("button", { name: /Delete delete-me/ }).click();
    await expect(page.getByRole("button", { name: /delete-me/ })).toHaveCount(
        0,
    );
});
