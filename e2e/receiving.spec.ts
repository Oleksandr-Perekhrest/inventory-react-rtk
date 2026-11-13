// outsource dependencies
import { test, expect } from "@playwright/test";

// local dependencies
import { localIsoDate } from "./support/date.ts";
import { parseQuantity, getColumnIndex } from "./support/table.ts";

// Orange Juice 1 L: perishable=false, unit="pcs" — no batch/expiry fields to fill,
// making the wizard flow as short as possible.
const PRODUCT_NAME = "Orange Juice 1 L";

test("posting a receipt with a discrepancy updates stock and the journal", async ({
    page,
}) => {
    // ── Read initial stock quantity ──────────────────────────────────────────
    await page.goto(`/catalog?q=${encodeURIComponent(PRODUCT_NAME)}`);
    const catalogRow = page.getByRole("row").filter({ hasText: PRODUCT_NAME });
    await expect(catalogRow).toBeVisible();
    const qIdx = await getColumnIndex(page, "Quantity");
    const beforeText = await catalogRow.getByRole("cell").nth(qIdx).innerText();
    const before = parseQuantity(beforeText);

    // ── Receiving wizard — Document step ─────────────────────────────────────
    await page.goto("/receiving");
    // Radix Select: click the combobox trigger, then the first supplier option.
    await page.getByRole("combobox", { name: "Supplier" }).click();
    await page.getByRole("option").first().click();
    await page.getByLabel("Invoice number").fill("E2E-001");
    // createEmptyDraft always prefills today's local date (useReceivingForm.ts).
    const dateInput = page.getByLabel("Date");
    await expect(dateInput).toHaveValue(localIsoDate(new Date()));
    await page.getByRole("button", { name: "Next" }).click();

    // ── Lines step ───────────────────────────────────────────────────────────
    await page.getByLabel("Product").fill(PRODUCT_NAME);
    await page.getByRole("option", { name: PRODUCT_NAME }).click();
    await page.getByLabel("Expected quantity").fill("7");
    await page.getByRole("button", { name: "Next" }).click();

    // ── Reconciliation step ──────────────────────────────────────────────────
    // The group is labelled by the product name span (aria-labelledby).
    const reconcileGroup = page.getByRole("group", { name: PRODUCT_NAME });
    await reconcileGroup.getByLabel("Actual quantity").fill("5");
    // Discrepancy note field appears once actual (5) differs from expected (7).
    await reconcileGroup
        .getByLabel("Discrepancy note")
        .fill("2 damaged in transit");
    await page.getByRole("button", { name: "Next" }).click();

    // ── Review step ──────────────────────────────────────────────────────────
    await page.getByRole("button", { name: "Post receipt" }).click();
    await expect(
        page.getByRole("heading", { name: "Receipt posted" }),
    ).toBeVisible();

    // ── Catalog: RTK Query cache-invalidation check (no reload) ──────────────
    await page.getByRole("link", { name: "Go to catalog" }).click();
    await page.getByLabel("Search products").fill(PRODUCT_NAME);
    const catalogRowAfter = page
        .getByRole("row")
        .filter({ hasText: PRODUCT_NAME });
    const cell = catalogRowAfter.getByRole("cell").nth(qIdx);
    // Intl grouping means 1,285 ≠ "1285", so compare numerically via poll.
    await expect
        .poll(async () => parseQuantity(await cell.innerText()))
        .toBe(before + 5);

    // ── Movements journal ────────────────────────────────────────────────────
    // Journal is sorted newest-first; the receipt (posted just now) is row 1.
    await page.goto("/movements");
    const tbody = page.getByRole("rowgroup").last();
    const firstRow = tbody.getByRole("row").first();
    await expect(firstRow).toBeVisible();

    // MovementTypeBadge renders the enum value directly ({type}), so the DOM
    // text is "receipt" (lowercase); CSS uppercase is applied visually only.
    await expect(firstRow).toContainText("receipt");

    // This receipt has a discrepancy (actual 5 ≠ expected 7), so MovementsTable
    // calls formatDiscrepancyQuantity(5, 7, "pcs") = "5 / 7 pcs" + "Short"
    // badge, NOT formatSignedQuantity. There is no "+5" text in a discrepancy row.
    await expect(firstRow).toContainText("5 / 7 pcs");
    await expect(firstRow).toContainText("Short");

    // The expanded detail <tr> is a DOM sibling of the data row (not a child),
    // rendered via Fragment immediately after it, so scope via "+" combinator.
    await firstRow
        .getByRole("button", { name: `Details: ${PRODUCT_NAME}` })
        .click();
    const detailRow = firstRow.locator("+ tr");
    await expect(detailRow.getByText("2 damaged in transit")).toBeVisible();
});
