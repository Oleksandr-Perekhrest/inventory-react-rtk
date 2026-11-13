// outsource dependencies
import { test, expect } from "@playwright/test";

// local dependencies
import { expectNoA11yViolations } from "./support/a11y.ts";

const CATEGORY_A_ID = "cat-pastry";
const PRODUCT = "Butter Croissant";

test("/ welcome page has no accessibility violations", async ({ page }) => {
    await page.goto("/");
    await expect(
        page.getByRole("heading", { level: 1, name: "Warehouse Manager" }),
    ).toBeVisible();
    await expectNoA11yViolations(page, "/ welcome");
});

test("/dashboard has no accessibility violations", async ({ page }) => {
    await page.goto("/dashboard");
    await expect(
        page.getByRole("heading", { level: 1, name: "Dashboard" }),
    ).toBeVisible();
    // "Stock value" is a card label rendered before data (values are skeletons);
    // the chart's role="img" label only exists once the dashboard data has loaded.
    await expect(
        page.getByRole("img", {
            name: /^Inflow and outflow over the last 30 days/,
        }),
    ).toBeVisible();
    await expect(page.getByRole("link", { name: "View all" })).toBeVisible();
    await expectNoA11yViolations(page, "/dashboard");
});

test("/catalog with tree and table loaded has no accessibility violations", async ({
    page,
}) => {
    await page.goto("/catalog");
    await expect(
        page.getByRole("heading", { level: 1, name: "Catalog" }),
    ).toBeVisible();
    await expect(
        page.getByRole("tree").getByRole("treeitem").first(),
    ).toBeVisible();
    await expect(
        page.getByRole("rowgroup").last().getByRole("row").first(),
    ).toBeVisible();
    await expectNoA11yViolations(page, "/catalog");
});

test("/receiving document step has no accessibility violations", async ({
    page,
}) => {
    await page.goto("/receiving");
    await expect(
        page.getByRole("heading", { level: 1, name: "Receiving" }),
    ).toBeVisible();
    await expect(
        page.getByRole("combobox", { name: "Supplier" }),
    ).toBeVisible();
    await expectNoA11yViolations(page, "/receiving document step");
});

test("/receiving lines step has no accessibility violations", async ({
    page,
}) => {
    await page.goto("/receiving");
    await expect(
        page.getByRole("heading", { level: 1, name: "Receiving" }),
    ).toBeVisible();
    await page.getByRole("combobox", { name: "Supplier" }).click();
    await page.getByRole("option").first().click();
    await page.getByLabel("Invoice number").fill("A11Y-001");
    await page.getByRole("button", { name: "Next" }).click();
    await expect(
        page.locator('[aria-current="step"]').filter({ hasText: "Lines" }),
    ).toBeVisible();
    await expectNoA11yViolations(page, "/receiving lines step");
});

test("/movements with rows loaded has no accessibility violations", async ({
    page,
}) => {
    await page.goto("/movements");
    await expect(
        page.getByRole("heading", { level: 1, name: "Movements" }),
    ).toBeVisible();
    await expect(
        page.getByRole("rowgroup").last().getByRole("row").first(),
    ).toBeVisible();
    await expectNoA11yViolations(page, "/movements");
});

test('"Move to category" dialog has no accessibility violations', async ({
    page,
}) => {
    await page.goto(`/catalog?categoryId=${CATEGORY_A_ID}`);
    await expect(
        page.getByRole("tree").getByRole("treeitem").first(),
    ).toBeVisible();
    await expect(
        page
            .getByRole("rowgroup")
            .last()
            .getByRole("row")
            .filter({ hasText: PRODUCT }),
    ).toBeVisible();
    const productRow = page.getByRole("row").filter({ hasText: PRODUCT });
    await productRow
        .getByRole("button", { name: `Actions for ${PRODUCT}` })
        .click();
    await page.getByRole("menuitem", { name: "Move to category…" }).click();
    await expect(page.getByRole("dialog")).toBeVisible();
    await expectNoA11yViolations(page, '"Move to category" dialog');
});

test('"Reset demo data" alert dialog has no accessibility violations', async ({
    page,
}) => {
    await page.goto("/");
    await expect(
        page.getByRole("heading", { level: 1, name: "Warehouse Manager" }),
    ).toBeVisible();
    await page.getByRole("button", { name: "Reset demo data" }).first().click();
    await expect(page.getByRole("alertdialog")).toBeVisible();
    await expectNoA11yViolations(page, '"Reset demo data" alertdialog');
});

test("/catalog at 375x812 with categories sheet open has no accessibility violations", async ({
    page,
}) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await page.goto("/catalog");
    await expect(
        page.getByRole("heading", { level: 1, name: "Catalog" }),
    ).toBeVisible();
    await page.getByRole("button", { name: /Category:/ }).click();
    await expect(
        page.getByRole("dialog", { name: "Categories" }),
    ).toBeVisible();
    await expect(
        page
            .getByRole("dialog", { name: "Categories" })
            .getByRole("treeitem")
            .first(),
    ).toBeVisible();
    await expectNoA11yViolations(page, "/catalog mobile with categories sheet");
});
