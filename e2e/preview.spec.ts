import { test, expect, type Page } from "@playwright/test";

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
    await expect(page.getByTestId("page-input")).toHaveValue("1");
    await expect(page.getByText("of 2")).toBeVisible();
});

test.describe("zoom", () => {
    test.beforeEach(async ({ page }) => {
        await page.goto("/");
        await page.getByRole("button", { name: "Start editing" }).click();
        await expect(page.getByTestId("preview-page-1")).toBeVisible();
    });

    async function chooseZoom(page: Page, name: string) {
        await page.getByRole("button", { name: "Zoom options" }).click();
        await page.getByRole("menuitemcheckbox", { name }).click();
    }

    test("fits the page until the zoom is changed by hand", async ({
        page,
    }) => {
        const zoom = page.getByTestId("zoom-level");
        await chooseZoom(page, "Fit to height");
        await expect(zoom).not.toHaveValue("100%");

        await page.getByRole("button", { name: "Zoom options" }).click();
        await expect(
            page.getByRole("menuitemcheckbox", { name: "Fit to height" }),
        ).toHaveAttribute("aria-checked", "true");
        await page.keyboard.press("Escape");

        await zoom.fill("150");
        await zoom.press("Enter");
        await expect(zoom).toHaveValue("150%");
        await page.getByRole("button", { name: "Zoom options" }).click();
        await expect(
            page.getByRole("menuitemcheckbox", { name: "Fit to height" }),
        ).toHaveAttribute("aria-checked", "false");
    });

    test("applies a preset, steps and resets from the menu", async ({
        page,
    }) => {
        const zoom = page.getByTestId("zoom-level");
        await chooseZoom(page, "250%");
        await expect(zoom).toHaveValue("250%");

        await page.getByRole("button", { name: "Zoom options" }).click();
        await page.getByRole("menuitem", { name: "Zoom in" }).click();
        await expect(zoom).toHaveValue("300%");

        await page.getByRole("button", { name: "Zoom options" }).click();
        const reset = page.getByRole("menuitem", { name: "Reset zoom" });
        await expect(reset).toContainText(/(⌘|Ctrl\+)0/);
        await reset.click();
        await expect(zoom).toHaveValue("100%");
    });

    test("zooms with a trackpad pinch", async ({ page }) => {
        const zoom = page.getByTestId("zoom-level");
        const preview = page.getByTestId("resume-preview");
        await preview.hover();

        // Trackpad pinches reach the page as ctrl+wheel events.
        await page.keyboard.down("Control");
        await page.mouse.wheel(0, -20);
        await page.keyboard.up("Control");
        await expect(zoom).not.toHaveValue("100%");
        const zoomedIn = parseFloat(await zoom.inputValue());
        expect(zoomedIn).toBeGreaterThan(100);
    });

    test("steps through presets with keyboard shortcuts over the preview", async ({
        page,
    }) => {
        const zoom = page.getByTestId("zoom-level");
        await page.getByTestId("resume-preview").hover();

        await page.keyboard.press("ControlOrMeta+=");
        await expect(zoom).toHaveValue("150%");
        await page.keyboard.press("ControlOrMeta+-");
        await page.keyboard.press("ControlOrMeta+-");
        await expect(zoom).toHaveValue("50%");
        await page.keyboard.press("ControlOrMeta+0");
        await expect(zoom).toHaveValue("100%");
    });

    test("leaves zoom shortcuts to the browser outside the preview", async ({
        page,
    }) => {
        await page.getByLabel("Resume filename").hover();
        await page.keyboard.press("ControlOrMeta+=");
        await expect(page.getByTestId("zoom-level")).toHaveValue("100%");
    });
});
