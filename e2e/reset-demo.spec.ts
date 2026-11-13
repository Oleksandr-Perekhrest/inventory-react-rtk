// outsource dependencies
import { test, expect } from "@playwright/test";

// local dependencies
import { readTreeItemCount } from "./support/tree.ts";

// Pastry and Bread are sibling leaf categories under Food > Bakery. Opening
// the catalog at ?categoryId=cat-pastry auto-expands their ancestors so both
// treeitems are visible without extra clicks. Butter Croissant belongs to
// Pastry in the seed data.
const CATEGORY_A_ID = "cat-pastry";
const CATEGORY_A = "Pastry";
const CATEGORY_B = "Bread";
const PRODUCT = "Butter Croissant";

test("Reset demo data restores moved products", async ({ page }) => {
    await page.goto(`/catalog?categoryId=${CATEGORY_A_ID}`);

    const tree = page.getByRole("tree");
    const categoryA = tree.getByRole("treeitem", {
        name: new RegExp(`^${CATEGORY_A}\\s+\\d+$`),
    });
    const categoryB = tree.getByRole("treeitem", {
        name: new RegExp(`^${CATEGORY_B}\\s+\\d+$`),
    });

    await expect(categoryA).toBeVisible();
    await expect(categoryB).toBeVisible();

    const initialPastryCount = await readTreeItemCount(categoryA);
    const initialBreadCount = await readTreeItemCount(categoryB);

    // ── Move "Butter Croissant" to Bread via the Actions menu ───────────────
    const productRow = page.getByRole("row").filter({ hasText: PRODUCT });
    await expect(productRow).toBeVisible();

    await productRow
        .getByRole("button", { name: `Actions for ${PRODUCT}` })
        .click();
    await page.getByRole("menuitem", { name: "Move to category…" }).click();

    // The dialog's combobox has no label; locate by its ARIA role within the dialog
    const dialog = page.getByRole("dialog");
    await dialog.getByRole("combobox").fill(CATEGORY_B);
    await dialog.getByRole("option", { name: CATEGORY_B, exact: true }).click();

    await expect(
        page.getByText(`Moved "${PRODUCT}" to "${CATEGORY_B}"`),
    ).toBeVisible();
    await expect
        .poll(() => readTreeItemCount(categoryA))
        .toBe(initialPastryCount - 1);
    await expect
        .poll(() => readTreeItemCount(categoryB))
        .toBe(initialBreadCount + 1);

    // ── Reset demo data ──────────────────────────────────────────────────────
    await page.getByRole("button", { name: "Reset demo data" }).click();
    await page
        .getByRole("alertdialog")
        .getByRole("button", { name: "Reset" })
        .click();

    // Tree counts return to their initial seed values
    await expect
        .poll(() => readTreeItemCount(categoryA))
        .toBe(initialPastryCount);
    await expect
        .poll(() => readTreeItemCount(categoryB))
        .toBe(initialBreadCount);

    // "Butter Croissant" is back in the Pastry table
    await expect(productRow).toBeVisible();
});
