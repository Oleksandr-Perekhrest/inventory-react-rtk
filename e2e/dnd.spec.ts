// outsource dependencies
import { test, expect } from "@playwright/test";

// local dependencies
import { dragOnto } from "./support/dnd.ts";
import { readTreeItemCount } from "./support/tree.ts";
import { setFailRequests } from "./support/network.ts";

// Pastry and Bread are sibling leaf categories under Food > Bakery. Opening the
// catalog at ?categoryId=cat-pastry auto-expands their ancestors, so both
// treeitems are visible without any extra clicks. Butter Croissant is a
// Pastry product (prd-0060 in src/mocks/seed/products.ts).
const CATEGORY_A_ID = "cat-pastry";
const CATEGORY_A = "Pastry";
const CATEGORY_B = "Bread";
const PRODUCT = "Butter Croissant";

test("dragging a product onto another category moves it", async ({ page }) => {
    await page.goto(`/catalog?categoryId=${CATEGORY_A_ID}`);

    const tree = page.getByRole("tree");
    const categoryA = tree.getByRole("treeitem", {
        name: new RegExp(`^${CATEGORY_A}\\s+\\d+$`),
    });
    const categoryB = tree.getByRole("treeitem", {
        name: new RegExp(`^${CATEGORY_B}\\s+\\d+$`),
    });
    const productRow = page.getByRole("row").filter({ hasText: PRODUCT });

    await expect(categoryA).toBeVisible();
    await expect(categoryB).toBeVisible();
    await expect(productRow).toBeVisible();

    const beforeCount = await readTreeItemCount(categoryB);

    await dragOnto(page, productRow, categoryB);

    await expect(
        page.getByText(`Moved "${PRODUCT}" to "${CATEGORY_B}"`),
    ).toBeVisible();
    await expect(productRow).toHaveCount(0);
    await expect.poll(() => readTreeItemCount(categoryB)).toBe(beforeCount + 1);
});

test("a failed move rolls back", async ({ page }) => {
    await page.goto(`/catalog?categoryId=${CATEGORY_A_ID}`);

    const tree = page.getByRole("tree");
    const categoryA = tree.getByRole("treeitem", {
        name: new RegExp(`^${CATEGORY_A}\\s+\\d+$`),
    });
    const categoryB = tree.getByRole("treeitem", {
        name: new RegExp(`^${CATEGORY_B}\\s+\\d+$`),
    });
    const productRow = page.getByRole("row").filter({ hasText: PRODUCT });

    await expect(categoryA).toBeVisible();
    await expect(categoryB).toBeVisible();
    await expect(productRow).toBeVisible();

    const beforeCount = await readTreeItemCount(categoryB);

    // Merge into the existing network settings so the mock layer returns 500
    // for PATCH /api/products/<id>, forcing the optimistic move to roll back.
    await setFailRequests(page, ["PATCH /api/products/*"]);

    await dragOnto(page, productRow, categoryB);

    await expect(page.getByText(`Couldn't move "${PRODUCT}"`)).toBeVisible();
    await expect(productRow).toBeVisible();
    await expect.poll(() => readTreeItemCount(categoryB)).toBe(beforeCount);
});
