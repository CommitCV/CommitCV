import { test, expect, type Locator, type Page } from "@playwright/test";

async function openEditor(page: Page) {
    await page.goto("/");
    await page.getByRole("button", { name: "Start editing" }).click();
}

/** Types `value` into the first text field and selects `word` in it. */
async function typeAndSelect(page: Page, value: string, word: string) {
    const text = page.getByLabel("Resume text").first();
    await text.fill(value);
    await text.evaluate((field, target) => {
        const node = field.firstChild!;
        const start = node.textContent!.indexOf(target);
        const range = document.createRange();
        range.setStart(node, start);
        range.setEnd(node, start + target.length);
        const selection = window.getSelection()!;
        selection.removeAllRanges();
        selection.addRange(range);
    }, word);
    return text;
}

async function rawValue(page: Page) {
    await page.getByRole("button", { name: "Raw" }).click();
    return page.getByLabel("Resume text").first().inputValue();
}

test.describe("formatted text", () => {
    test("shows markup as styled text and raw mode shows the markup", async ({
        page,
    }) => {
        await openEditor(page);
        const email = page.getByLabel("Resume text").first();
        await expect(email.locator("a")).toHaveAttribute(
            "href",
            "mailto:alex.reynolds@example.com",
        );
        await expect(email).toHaveText("alex.reynolds@example.com");

        await page.getByRole("button", { name: "Raw" }).click();
        await expect(page.getByLabel("Resume text").first()).toHaveValue(
            "[alex.reynolds@example.com](mailto:alex.reynolds@example.com)",
        );
    });

    test("styles a selection with keyboard shortcuts", async ({ page }) => {
        await openEditor(page);
        const text = await typeAndSelect(page, "say hi now", "hi");
        await text.press("ControlOrMeta+b");
        await expect(text.locator("b")).toHaveText("hi");
        await text.press("ControlOrMeta+i");
        await text.press("ControlOrMeta+u");
        expect(await rawValue(page)).toBe("say **__*hi*__** now");
    });

    test("styles a selection from the toolbar and links it", async ({
        page,
    }) => {
        await openEditor(page);
        const toolbar = page.getByRole("toolbar", { name: "Formatting" });
        await typeAndSelect(page, "say hi now", "hi");
        await toolbar.getByLabel("Bold").click();
        page.once("dialog", (dialog) => dialog.accept("https://a.com"));
        await toolbar.getByLabel("Insert link").click();
        expect(await rawValue(page)).toBe("say [**hi**](https://a.com) now");
    });

    test("toggles the whole line's style with no selection", async ({
        page,
    }) => {
        await openEditor(page);
        const text = page.getByLabel("Resume text").first();
        await text.click();
        await text.press("ControlOrMeta+b");
        await expect(
            page
                .getByRole("toolbar", { name: "Formatting" })
                .getByLabel("Bold"),
        ).toHaveAttribute("aria-pressed", "true");
        await expect(text).toHaveCSS("font-weight", "700");
    });

    test("keeps markup intact when typing in a styled line", async ({
        page,
    }) => {
        await openEditor(page);
        await page.getByRole("button", { name: "Raw" }).click();
        await page
            .getByLabel("Resume text")
            .first()
            .fill("Built **X** in [site](https://a.com)");
        await page.getByRole("button", { name: "Formatted" }).click();
        const text = page.getByLabel("Resume text").first();
        await text.click();
        await text.press("End");
        await text.pressSequentially(" and Y");
        expect(await rawValue(page)).toBe(
            "Built **X** in [site](https://a.com) and Y",
        );
    });

    test("shortcuts work in raw mode too", async ({ page }) => {
        await openEditor(page);
        await page.getByRole("button", { name: "Raw" }).click();
        const text = page.getByLabel("Resume text").first();
        await text.fill("say hi now");
        await text.evaluate((input: HTMLInputElement) =>
            input.setSelectionRange(4, 6),
        );
        await text.press("ControlOrMeta+u");
        await expect(text).toHaveValue("say __hi__ now");
    });
});

test.describe("raw mode toggling", () => {
    test("pressing a style twice removes it again", async ({ page }) => {
        await openEditor(page);
        await page.getByRole("button", { name: "Raw" }).click();
        const text = page.getByLabel("Resume text").first();
        await text.fill("say hi now");
        await text.evaluate((input: HTMLInputElement) =>
            input.setSelectionRange(4, 6),
        );
        for (const key of ["b", "i", "u"]) {
            await text.press(`ControlOrMeta+${key}`);
            await expect(text).not.toHaveValue("say hi now");
            await text.press(`ControlOrMeta+${key}`);
            await expect(text).toHaveValue("say hi now");
        }
    });
});

test.describe("raw mode styling", () => {
    async function rawField(page: Page, value: string) {
        await openEditor(page);
        await page.getByRole("button", { name: "Raw" }).click();
        const text = page.getByLabel("Resume text").first();
        await text.fill(value);
        return text;
    }

    async function select(text: Locator, start: number, end = start) {
        await text.evaluate(
            (input: HTMLInputElement, [from, to]) =>
                input.setSelectionRange(from, to),
            [start, end],
        );
    }

    test("lights up the buttons for the style at the caret", async ({
        page,
    }) => {
        const text = await rawField(page, "say **hi** *now*");
        const toolbar = page.getByRole("toolbar", { name: "Formatting" });
        /** Moves the caret like a person would, so the field reports it. */
        async function caretAt(offset: number) {
            await text.press("Home");
            for (let i = 0; i < offset; i += 1) await text.press("ArrowRight");
        }
        await caretAt(7);
        await expect(toolbar.getByLabel("Bold")).toHaveAttribute(
            "aria-pressed",
            "true",
        );
        await expect(toolbar.getByLabel("Italic")).toHaveAttribute(
            "aria-pressed",
            "false",
        );
        await caretAt(14);
        await expect(toolbar.getByLabel("Italic")).toHaveAttribute(
            "aria-pressed",
            "true",
        );
        await caretAt(2);
        await expect(toolbar.getByLabel("Bold")).toHaveAttribute(
            "aria-pressed",
            "false",
        );
    });

    test("merges an overlapping style instead of nesting markers", async ({
        page,
    }) => {
        const text = await rawField(page, "say **hi** now");
        await select(text, 0, 14);
        await text.press("ControlOrMeta+b");
        await expect(text).toHaveValue("**say hi now**");
        await text.press("ControlOrMeta+b");
        await expect(text).toHaveValue("say hi now");
    });
});
