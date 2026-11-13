// outsource dependencies
import { test, expect } from "@playwright/test";

test("journal filters survive a reload and a shared link", async ({
    page,
    browser,
}) => {
    await page.goto("/movements");

    const typeGroup = page.getByRole("group", { name: "Type" });
    const presetGroup = page.getByRole("group", { name: "Date presets" });

    await typeGroup.getByRole("button", { name: "Receipt" }).click();
    // Wait for the first click's state to commit before clicking the preset,
    // otherwise the re-render triggered by Receipt can swallow the second click.
    await expect(page).toHaveURL(/type=receipt/);
    await presetGroup.getByRole("button", { name: "Last 30 days" }).click();

    // Wait for URL to carry both params — the URL is the source of truth for
    // TanStack Router state, so once it reflects both filters the aria-pressed
    // values and the pending fetch are guaranteed to be consistent.
    await expect(page).toHaveURL(/type=receipt/);
    await expect(page).toHaveURL(/from=\d{4}-\d{2}-\d{2}/);
    await expect(
        typeGroup.getByRole("button", { name: "Receipt" }),
    ).toHaveAttribute("aria-pressed", "true");
    await expect(
        presetGroup.getByRole("button", { name: "Last 30 days" }),
    ).toHaveAttribute("aria-pressed", "true");

    // Wait for the fetch triggered by the preset to settle; aria-busy is added
    // to the table wrapper while isFetching && data are both truthy.
    await expect.poll(() => page.locator('[aria-busy="true"]').count()).toBe(0);

    const countParagraph = page
        .locator("p")
        .filter({ hasText: /\d+ movements?/ });
    await expect(countParagraph).toBeVisible();

    const storedUrl = page.url();
    const storedCount = await countParagraph.innerText();

    // ── Reload ──────────────────────────────────────────────────────────────
    await page.reload();

    expect(page.url()).toBe(storedUrl);
    await expect(countParagraph).toHaveText(storedCount);
    await expect(
        typeGroup.getByRole("button", { name: "Receipt" }),
    ).toHaveAttribute("aria-pressed", "true");
    await expect(
        presetGroup.getByRole("button", { name: "Last 30 days" }),
    ).toHaveAttribute("aria-pressed", "true");

    // Every visible body row contains the receipt type badge text
    const tbody = page.getByRole("rowgroup").last();
    const rows = tbody.getByRole("row");
    const rowCount = await rows.count();
    for (let i = 0; i < rowCount; i++) {
        await expect(rows.nth(i)).toContainText("receipt");
    }

    // ── Shared link in a new browser context ────────────────────────────────
    // A new context has its own localStorage and its own seed-built MSW
    // database, so the seed receipts are identical to the first context.
    const ctx = await browser.newContext({
        baseURL: "http://localhost:4173",
        serviceWorkers: "allow",
    });
    try {
        const page2 = await ctx.newPage();
        await page2.goto(storedUrl);

        const typeGroup2 = page2.getByRole("group", { name: "Type" });
        const presetGroup2 = page2.getByRole("group", { name: "Date presets" });
        const countParagraph2 = page2
            .locator("p")
            .filter({ hasText: /\d+ movements?/ });

        await expect(countParagraph2).toHaveText(storedCount);
        await expect(
            typeGroup2.getByRole("button", { name: "Receipt" }),
        ).toHaveAttribute("aria-pressed", "true");
        await expect(
            presetGroup2.getByRole("button", { name: "Last 30 days" }),
        ).toHaveAttribute("aria-pressed", "true");
    } finally {
        await ctx.close();
    }
});
