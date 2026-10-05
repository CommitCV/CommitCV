import { test, expect, type Page } from "@playwright/test";

async function openEditor(page: Page) {
    await page.goto("/");
    await page.getByRole("button", { name: "Start editing" }).click();
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
        await page.getByRole("button", { name: "Toggle bold" }).first().click();
        await expect(
            page.getByRole("button", { name: "Toggle bold" }).first(),
        ).toHaveAttribute("aria-pressed", "true");
    });

    test("keeps inline formatting when editing part of a line", async ({
        page,
    }) => {
        await openEditor(page);
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
        await expect(detailedHeading).toBeHidden();
        await newSection
            .getByRole("button", { name: "New section", exact: true })
            .click();
        await expect(detailedHeading).toBeVisible();
        await newSection
            .getByRole("button", { name: "New section", exact: true })
            .click();
        await expect(detailedHeading).toBeHidden();
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
});
