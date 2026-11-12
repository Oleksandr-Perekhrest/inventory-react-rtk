// outsource dependencies
import userEvent from "@testing-library/user-event";
import { screen, within, waitFor } from "@testing-library/react";
import {
    it,
    vi,
    expect,
    afterAll,
    describe,
    afterEach,
    beforeAll,
} from "vitest";

// local dependencies
import { setBackendReady } from "@/api/backendReady";
import { createMockServer } from "@/test/mockServer";
import { renderWithRouter } from "@/test/renderWithRouter";
import { JOURNAL_SEARCH_DEFAULTS } from "@/features/movements/journalSearch";

const PAGE_SIZE = JOURNAL_SEARCH_DEFAULTS.pageSize;

const { db, server } = createMockServer();

type M = (typeof db.movements)[number];

function mirrorSort(movements: readonly M[], order: string): M[] {
    return [...movements].sort((a, b) => {
        const sign = order === "asc" ? 1 : -1;
        const dateCmp = a.date.localeCompare(b.date);
        if (dateCmp !== 0) return sign * dateCmp;
        return sign * a.id.localeCompare(b.id);
    });
}

function getBodyRows(): HTMLElement[] {
    const rowgroups = screen.getAllByRole("rowgroup");
    return within(rowgroups[1]).getAllByRole("row");
}

function formatCount(n: number): string {
    return `${new Intl.NumberFormat("en-US").format(n)} movement${n !== 1 ? "s" : ""}`;
}

function localIsoDate(d: Date): string {
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function escapeRegStr(s: string): string {
    return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

beforeAll(() => server.listen({ onUnhandledFrame: "error" }));
afterAll(() => server.close());
afterEach(() => {
    server.resetHandlers();
    setBackendReady(Promise.resolve());
});

describe("Preset filter", () => {
    afterEach(() => {
        vi.useRealTimers();
    });

    it("Last 7 days sets aria-pressed, URL from/to, count matches db range", async () => {
        const user = userEvent.setup();
        const total = db.movements.length;

        const expectedFrom = "2026-10-31";
        const expectedTo = "2026-11-06";

        const rangeMovements = mirrorSort(
            db.movements.filter((m) => {
                const d = localIsoDate(new Date(m.date));
                return d >= expectedFrom && d <= expectedTo;
            }),
            "desc",
        );
        const rangeCount = rangeMovements.length;
        expect(rangeCount).toBeGreaterThan(0);
        expect(rangeCount).toBeLessThan(total);

        const productMap = new Map(db.products.map((p) => [p.id, p]));
        const firstRangeMovement = rangeMovements[0];
        const firstRangeProduct = productMap.get(firstRangeMovement.productId);
        if (!firstRangeProduct)
            throw new Error("Product not found for first range movement");

        vi.useFakeTimers({ toFake: ["Date"] });
        vi.setSystemTime(new Date(2026, 10, 6, 18, 0));

        const { router } = await renderWithRouter("/movements");
        await screen.findByText(formatCount(total));

        await user.click(screen.getByRole("button", { name: "Last 7 days" }));

        await screen.findByText(formatCount(rangeCount));
        expect(
            screen.getByRole("button", { name: "Last 7 days" }),
        ).toHaveAttribute("aria-pressed", "true");
        expect(router.state.location.searchStr).toContain(
            `from=${expectedFrom}`,
        );
        expect(router.state.location.searchStr).toContain(`to=${expectedTo}`);

        const rows = getBodyRows();
        expect(rows[0]).toHaveTextContent(firstRangeProduct.name);
        expect(rows[0]).toHaveTextContent(firstRangeMovement.reference);
    });
});

describe("Product filter", () => {
    it("type name, pick with ArrowDown+Enter -> productId URL and count; Clear removes productId and focuses input", async () => {
        const user = userEvent.setup();
        const total = db.movements.length;

        // Product outside the first 20 alphabetically, so the initial unfiltered
        // dropdown (pageSize=20 sorted by name) does not show it; findByRole then
        // waits for the debounced filtered results before resolving.
        const sortedByName = [...db.products].sort((a, b) =>
            a.name.localeCompare(b.name),
        );
        const targetProduct = sortedByName
            .slice(20)
            .find((p) => db.movements.some((m) => m.productId === p.id));
        if (!targetProduct) throw new Error("No suitable product found");

        const productMovementCount = db.movements.filter(
            (m) => m.productId === targetProduct.id,
        ).length;
        const prefix = targetProduct.name.slice(0, 10);

        const { router } = await renderWithRouter("/movements");
        await screen.findByText(formatCount(total));

        const combobox = screen.getByRole("combobox", { name: /product/i });
        await user.click(combobox);
        await user.type(combobox, prefix);
        await screen.findByRole("option", {
            name: new RegExp(escapeRegStr(targetProduct.name)),
        });
        await user.keyboard("{ArrowDown}");
        await user.keyboard("{Enter}");

        await waitFor(() => {
            expect(router.state.location.searchStr).toContain("productId=");
        });
        await screen.findByText(formatCount(productMovementCount));

        const clearBtn = screen.getByRole("button", {
            name: "Clear product filter",
        });
        await user.click(clearBtn);

        await waitFor(() => {
            expect(router.state.location.searchStr).not.toContain("productId=");
        });
        expect(combobox).toHaveFocus();
    });
});

describe("Unknown product", () => {
    it("?productId=prd-does-not-exist shows error; Clear product filter restores total count", async () => {
        const user = userEvent.setup();
        const total = db.movements.length;

        const { router } = await renderWithRouter(
            "/movements?productId=prd-does-not-exist",
        );

        await screen.findByText("This product doesn't exist");

        const errorContainer = screen
            .getByText("This product doesn't exist")
            .closest("div");
        if (!errorContainer) throw new Error("Error state container not found");
        await user.click(
            within(errorContainer).getByRole("button", {
                name: "Clear product filter",
            }),
        );

        await screen.findByText(formatCount(total));
        expect(router.state.location.searchStr).not.toContain("productId=");
    });
});

describe("Empty with filters", () => {
    it("?from=2030-01-01&to=2030-01-31 shows empty state; Clear filters restores total and removes from/to", async () => {
        const user = userEvent.setup();
        const total = db.movements.length;

        const { router } = await renderWithRouter(
            "/movements?from=2030-01-01&to=2030-01-31",
        );

        await screen.findByText("No movements match these filters");

        const emptyContainer = screen
            .getByText("No movements match these filters")
            .closest("div");
        if (!emptyContainer) throw new Error("Empty state container not found");
        await user.click(
            within(emptyContainer).getByRole("button", {
                name: "Clear filters",
            }),
        );

        await screen.findByText(formatCount(total));
        expect(router.state.location.searchStr).not.toContain("from=");
        expect(router.state.location.searchStr).not.toContain("to=");
    });
});

describe("Expandable rows", () => {
    it("first expandable receipt shows detail term; Next page collapses all", async () => {
        const user = userEvent.setup();
        const receiptTotal = db.movements.filter(
            (m) => m.type === "receipt",
        ).length;

        const page1Receipts = mirrorSort(
            db.movements.filter((m) => m.type === "receipt"),
            "desc",
        ).slice(0, PAGE_SIZE);

        const productMap = new Map(db.products.map((p) => [p.id, p]));

        const expandableReceipt = page1Receipts.find(
            (m) =>
                m.batch !== undefined ||
                m.expiresAt !== undefined ||
                m.comment !== undefined ||
                m.discrepancyNote !== undefined ||
                (m.expectedQuantity !== undefined &&
                    m.expectedQuantity !== m.quantity),
        );
        if (!expandableReceipt)
            throw new Error("No expandable receipt on page 1");

        const product = productMap.get(expandableReceipt.productId);
        if (!product) throw new Error("Product not found for receipt");

        await renderWithRouter("/movements?type=receipt");
        await screen.findByText(formatCount(receiptTotal));

        // Identify the target row by product name + reference together
        const rows = getBodyRows();
        const targetRow = rows.find(
            (row) =>
                row.textContent?.includes(product.name) &&
                row.textContent?.includes(expandableReceipt.reference),
        );
        if (!targetRow) throw new Error("Target row not found in body");

        expect(targetRow).toHaveTextContent(product.name);
        expect(targetRow).toHaveTextContent(expandableReceipt.reference);

        const detailBtn = within(targetRow).queryByRole("button", {
            name: new RegExp(`^Details: ${escapeRegStr(product.name)}`),
        });
        if (!detailBtn) throw new Error("No Details button in target row");

        // Precondition: row has an expandable details button
        expect(detailBtn).toBeInTheDocument();

        await user.click(detailBtn);

        await waitFor(() => {
            expect(detailBtn).toHaveAttribute("aria-expanded", "true");
        });

        const detailRow = document.getElementById(
            `detail-${expandableReceipt.id}`,
        );
        if (!detailRow) throw new Error("Detail row not found after expansion");

        if (expandableReceipt.batch !== undefined) {
            expect(within(detailRow).getByText("Batch")).toBeInTheDocument();
        } else if (expandableReceipt.comment !== undefined) {
            expect(within(detailRow).getByText("Comment")).toBeInTheDocument();
        }

        await user.click(screen.getByRole("button", { name: "Next page" }));

        const rangeEnd = Math.min(PAGE_SIZE * 2, receiptTotal);
        await screen.findByText(
            `${PAGE_SIZE + 1}–${rangeEnd} of ${receiptTotal}`,
        );

        // RTK Query shows stale page-1 rows while page-2 loads; wait for the
        // expanded row to leave the DOM before asserting no button is expanded.
        await waitFor(() => {
            expect(detailBtn).not.toBeInTheDocument();
        });

        for (const btn of screen.queryAllByRole("button", {
            name: /^Details:/,
        })) {
            expect(btn).not.toHaveAttribute("aria-expanded", "true");
        }
    });
});
