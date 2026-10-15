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
            .click({ button: "right", position: { x: 4, y: 4 } });
        await page.getByRole("menuitem", { name: "Move down" }).click();
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

    test("reorders sections from the right-click menu", async ({ page }) => {
        await openEditor(page);
        const education = page.getByTestId("section-editor-1");
        await education.click({ button: "right", position: { x: 4, y: 4 } });
        const menu = page.getByRole("menu");
        // Nothing moves above the header.
        await expect(
            menu.getByRole("menuitem", { name: "Move up" }),
        ).toBeDisabled();
        await page.keyboard.press("Escape");
        await expect(menu).toBeHidden();

        await education.click({ button: "right", position: { x: 4, y: 4 } });
        await menu.getByRole("menuitem", { name: "Move down" }).click();
        await expect(
            page
                .getByTestId("section-editor-2")
                .getByLabel("Section heading")
                .first(),
        ).toHaveValue("Education");
        await expect(page.getByLabel("Move section up")).toHaveCount(0);
    });

    test("keeps the browser menu on text inputs", async ({ page }) => {
        await openEditor(page, { raw: true });
        await page.getByLabel("Resume text").first().click({ button: "right" });
        await expect(page.getByRole("menu")).toHaveCount(0);
    });

    test("opens the section menu from the section heading", async ({
        page,
    }) => {
        await openEditor(page);
        await page
            .getByTestId("section-editor-1")
            .getByLabel("Section heading")
            .first()
            .click({ button: "right" });
        await expect(
            page.getByRole("menuitem", { name: "Move down" }),
        ).toBeVisible();
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

    test("drags a section before another", async ({ page }) => {
        await openEditor(page);
        const skills = page.getByTestId("section-editor-4");
        const bar = page
            .getByTestId("section-editor-1")
            .locator("> div")
            .first();
        const box = (await bar.boundingBox())!;
        // Grab the frame's padding, away from its inputs and buttons.
        await skills.dragTo(bar, {
            sourcePosition: { x: 4, y: 4 },
            targetPosition: { x: box.width / 2, y: 2 },
        });
        await expect(
            page
                .getByTestId("section-editor-1")
                .getByLabel("Section heading")
                .first(),
        ).toHaveValue("Technical Skills");
    });

    test("nests a section by dropping it onto another", async ({ page }) => {
        await openEditor(page);
        const bar = page
            .getByTestId("section-editor-2")
            .locator("> div")
            .first();
        const box = (await bar.boundingBox())!;
        await page.getByTestId("section-editor-3").dragTo(bar, {
            sourcePosition: { x: 4, y: 4 },
            targetPosition: { x: box.width / 2, y: box.height / 2 },
        });
        await expect(page.getByTestId("section-editor-3")).toHaveCount(1);
        const nested = page.getByTestId(/^section-editor-2-\d+$/).last();
        await expect(
            nested.getByRole("button", { name: "Remove Projects" }),
        ).toBeVisible();
    });

    test("selects text in an input without dragging its frame", async ({
        page,
    }) => {
        await openEditor(page, { raw: true });
        const text = page.getByLabel("Resume text").nth(1);
        const value = await text.inputValue();
        const box = (await text.boundingBox())!;
        await page.mouse.move(box.x + 4, box.y + box.height / 2);
        await page.mouse.down();
        await page.mouse.move(box.x + box.width - 4, box.y + box.height / 2, {
            steps: 5,
        });
        await page.mouse.up();
        await expect(text).toHaveValue(value);
        expect(
            await text.evaluate(
                (input: HTMLInputElement) =>
                    input.selectionEnd! - input.selectionStart!,
            ),
        ).toBeGreaterThan(0);
    });

    test("opens a closed section when a drag hovers over it", async ({
        page,
    }) => {
        await openEditor(page);
        const experience = page.getByTestId("section-editor-2");
        const toggle = experience.getByRole("button", {
            name: "Experience",
            exact: true,
        });
        await expect(toggle).toHaveAttribute("aria-expanded", "false");

        // The open header pushes Projects below the fold.
        await page.getByTestId("section-editor-3").scrollIntoViewIfNeeded();
        const source = (await page
            .getByTestId("section-editor-3")
            .boundingBox())!;
        const bar = (await experience.locator("> div").first().boundingBox())!;
        await page.mouse.move(source.x + 4, source.y + 4);
        await page.mouse.down();
        await page.mouse.move(bar.x + bar.width / 2, bar.y + bar.height / 2, {
            steps: 5,
        });
        await expect(toggle).toHaveAttribute("aria-expanded", "true");
        await page.mouse.up();

        await expect(
            experience
                .getByTestId(/^section-editor-2-\d+$/)
                .last()
                .getByRole("button", { name: "Remove Projects" }),
        ).toBeVisible();
    });

    test("leaves a closed section shut when a drag passes over it", async ({
        page,
    }) => {
        await openEditor(page);
        const toggle = page.getByRole("button", {
            name: "Experience",
            exact: true,
        });
        // The open header pushes Projects below the fold.
        await page.getByTestId("section-editor-3").scrollIntoViewIfNeeded();
        const source = (await page
            .getByTestId("section-editor-3")
            .boundingBox())!;
        const bar = (await page
            .getByTestId("section-editor-2")
            .locator("> div")
            .first()
            .boundingBox())!;
        await page.mouse.move(source.x + 4, source.y + 4);
        await page.mouse.down();
        await page.mouse.move(bar.x + bar.width / 2, bar.y + bar.height / 2, {
            steps: 5,
        });
        // Move on before the spring-open delay elapses.
        await page.mouse.move(source.x + 4, source.y + 4, { steps: 2 });
        await page.mouse.up();
        await page.waitForTimeout(800);
        await expect(toggle).toHaveAttribute("aria-expanded", "false");
    });

    test("closes a drag-opened section after the drag moves away", async ({
        page,
    }) => {
        await openEditor(page);
        const toggle = page.getByRole("button", {
            name: "Experience",
            exact: true,
        });
        // The open header pushes Projects below the fold.
        await page.getByTestId("section-editor-3").scrollIntoViewIfNeeded();
        const source = (await page
            .getByTestId("section-editor-3")
            .boundingBox())!;
        const bar = (await page
            .getByTestId("section-editor-2")
            .locator("> div")
            .first()
            .boundingBox())!;
        await page.mouse.move(source.x + 4, source.y + 4);
        await page.mouse.down();
        await page.mouse.move(bar.x + bar.width / 2, bar.y + bar.height / 2, {
            steps: 5,
        });
        await expect(toggle).toHaveAttribute("aria-expanded", "true");

        // Hover the Education bar instead, outside Experience.
        const education = (await page
            .getByTestId("section-editor-1")
            .locator("> div")
            .first()
            .boundingBox())!;
        await page.mouse.move(education.x + 4, education.y + 2, { steps: 3 });
        await expect(toggle).toHaveAttribute("aria-expanded", "false");
        await page.mouse.up();
    });

    test("drags text into another section", async ({ page }) => {
        await openEditor(page, { raw: true });
        const header = page.getByTestId("section-editor-0");
        const texts = header.getByLabel("Resume text");
        await expect(texts.first()).toBeVisible();
        const before = await texts.count();
        const moved = await texts.first().inputValue();
        const bar = page
            .getByTestId("section-editor-1")
            .locator("> div")
            .first();
        await header.getByTitle("Text", { exact: true }).first().dragTo(bar);
        await expect(texts).toHaveCount(before - 1);
        await expect(
            page
                .getByTestId("section-editor-1")
                .getByLabel("Resume text")
                .last(),
        ).toHaveValue(moved);
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
