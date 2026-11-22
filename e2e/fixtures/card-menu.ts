import type { Locator, Page } from "@playwright/test";

/**
 * Opens a library card's three-dot menu. The page is scrolled to the button
 * first and left to settle, because the menu closes on any scroll.
 */
export async function openCardMenu(page: Page, button: Locator) {
    await button.scrollIntoViewIfNeeded();
    await page.evaluate(
        () =>
            new Promise((done) =>
                requestAnimationFrame(() => requestAnimationFrame(done)),
            ),
    );
    await button.click();
}
