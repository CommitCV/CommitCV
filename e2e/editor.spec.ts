import { test, expect, type Page } from "@playwright/test";

async function openEditor(page: Page, { raw = false } = {}) {
    await page.goto("/");
    await page.getByRole("button", { name: "Start editing" }).click();
    // Raw mode shows text fields as plain inputs holding the markup.
    if (raw) await page.getByRole("button", { name: "Raw" }).click();
}

test.describe("editor", () => {
    test("edits section text and formatting", async ({ page }) => {
        await openEditor(page);
        await page
            .getByRole("button", { name: "Education", exact: true })
            .click();
        const heading = page.getByLabel("Section heading").first();
        await heading.fill("Profile");
        await expect(heading).toHaveValue("Profile");

        const text = page.getByLabel("Resume text").first();
        await text.fill("A new profile");
        const bold = page
            .getByRole("toolbar", { name: "Formatting" })
            .getByLabel("Bold");
        await bold.click();
        await expect(bold).toHaveAttribute("aria-pressed", "true");
    });

    test("formats selected text from the toolbar", async ({ page }) => {
        await openEditor(page, { raw: true });
        const toolbar = page.getByRole("toolbar", { name: "Formatting" });
        await expect(toolbar.getByLabel("Bold")).toBeDisabled();

        const text = page.getByLabel("Resume text").first();
        await text.fill("say hi now");
        await text.evaluate((input: HTMLInputElement) =>
            input.setSelectionRange(4, 6),
        );
        await toolbar.getByLabel("Bold").click();
        await expect(text).toHaveValue("say **hi** now");

        page.once("dialog", (dialog) => dialog.accept("https://a.com"));
        await toolbar.getByLabel("Insert link").click();
        await expect(text).toHaveValue("say **[hi](https://a.com)** now");
    });

    test("keeps inline formatting when editing part of a line", async ({
        page,
    }) => {
        await openEditor(page, { raw: true });
        const text = page.getByLabel("Resume text").first();
        await text.fill("Built **X** in [site](https://a.com) and Y");
        await text.press("End");
        await text.pressSequentially("!");
        await expect(text).toHaveValue(
            "Built **X** in [site](https://a.com) and Y!",
        );
    });

    test("keeps a section open state with the section when it moves", async ({
        page,
    }) => {
        await openEditor(page);
        const education = page.getByRole("button", {
            name: "Education",
            exact: true,
        });
        await education.click();
        await expect(education).toHaveAttribute("aria-expanded", "true");
        await page
            .getByTestId("section-editor-1")
            .getByLabel("Move section down")
            .click();
        await expect(education).toHaveAttribute("aria-expanded", "true");
        await expect(
            page.getByRole("button", { name: "Experience", exact: true }),
        ).toHaveAttribute("aria-expanded", "false");
    });

    test("adds, collapses, and disables a section", async ({ page }) => {
        await openEditor(page);
        await page.getByRole("button", { name: "Add section" }).click();
        await expect(
            page.getByRole("button", { name: "New section", exact: true }),
        ).toBeVisible();
        const newSection = page
            .locator("article")
            .filter({
                has: page.getByRole("button", {
                    name: "New section",
                    exact: true,
                }),
            })
            .last();
        await newSection
            .getByRole("button", { name: "Disable section" })
            .click();
        await expect(
            newSection.getByRole("button", { name: "Enable section" }),
        ).toHaveAttribute("aria-pressed", "false");
        const detailedHeading = newSection.getByRole("textbox", {
            name: "Section heading",
            exact: true,
        });
        await expect(detailedHeading).toBeVisible();
        const toggle = newSection.getByRole("button", {
            name: "New section",
            exact: true,
        });
        // New sections open ready to fill in.
        await expect(toggle).toHaveAttribute("aria-expanded", "true");
        await toggle.click();
        await expect(toggle).toHaveAttribute("aria-expanded", "false");
        await toggle.click();
        await expect(toggle).toHaveAttribute("aria-expanded", "true");
    });

    test("deletes a nested section", async ({ page }) => {
        await openEditor(page);
        await page
            .getByRole("button", { name: "Experience", exact: true })
            .click();
        await expect(
            page.getByRole("button", { name: "Remove nested section" }).first(),
        ).toBeVisible();
        await page
            .getByRole("button", { name: "Remove nested section" })
            .first()
            .click();
        await expect(
            page.getByRole("button", { name: "Remove nested section" }),
        ).toHaveCount(0);
    });

    test("undoes and redoes typing with shortcuts", async ({ page }) => {
        await openEditor(page, { raw: true });
        const undo = page.getByRole("button", { name: "Undo" });
        const redo = page.getByRole("button", { name: "Redo" });
        await expect(undo).toBeDisabled();
        await expect(redo).toBeDisabled();

        const text = page.getByLabel("Resume text").first();
        const original = await text.inputValue();
        await text.fill("typed text");
        await expect(undo).toBeEnabled();

        await text.press("ControlOrMeta+z");
        await expect(text).toHaveValue(original);
        await expect(redo).toBeEnabled();
        await text.press("ControlOrMeta+Shift+z");
        await expect(text).toHaveValue("typed text");
    });

    test("undoes a section removal from the toolbar", async ({ page }) => {
        await openEditor(page);
        const experience = page.getByRole("button", {
            name: "Experience",
            exact: true,
        });
        await experience.click();
        await page
            .getByRole("button", { name: "Remove nested section" })
            .first()
            .click();
        await expect(
            page.getByRole("button", { name: "Remove nested section" }),
        ).toHaveCount(0);

        await page.getByRole("button", { name: "Undo" }).click();
        await expect(
            page.getByRole("button", { name: "Remove nested section" }).first(),
        ).toBeVisible();
    });
});
