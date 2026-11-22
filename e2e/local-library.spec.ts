import { openCardMenu } from "./fixtures/card-menu";
import { test, expect } from "@playwright/test";

test("autosaves and reopens a local resume", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("button", { name: "Start editing" }).click();
    await page.getByLabel("Resume filename").fill("library-resume");

    await page.getByRole("link", { name: "Resume Library" }).click();
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
    await page.getByRole("link", { name: "Resume Library" }).click();
    await openCardMenu(
        page,
        page.getByRole("button", { name: "Actions for delete-me" }),
    );
    await page.getByRole("menuitem", { name: "Delete" }).click();
    await page
        .getByRole("button", { name: "Confirm delete delete-me" })
        .click();
    await expect(page.getByRole("button", { name: /delete-me/ })).toHaveCount(
        0,
    );
});

test("autosaves an edit without any commit UI", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("button", { name: "Start editing" }).click();
    await expect(
        page.getByRole("button", { name: "Commit Changes" }),
    ).toHaveCount(0);
    await page.getByLabel("Resume filename").fill("autosaved");
    await expect(page.getByRole("status")).toHaveCount(0);
    await expect(
        page.getByRole("button", { name: "Commit Changes" }),
    ).toHaveCount(0);

    // Stay in the editor so the debounce, not the unmount flush, does the save.
    await page.waitForTimeout(1500);
    await page.reload();
    await page.getByRole("link", { name: "Resume Library" }).click();
    await page
        .getByRole("button", { name: /autosaved/ })
        .first()
        .click();
    await expect(page.getByLabel("Resume filename")).toHaveValue("autosaved");
});

test("a new resume is in the library even if untouched", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("button", { name: "Start editing" }).click();
    await expect(page.getByLabel("Resume filename")).toBeVisible();
    await page.getByRole("link", { name: "Resume Library" }).click();
    await expect(
        page.getByRole("button", { name: /Actions for / }),
    ).toHaveCount(1);
});
