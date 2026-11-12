// outsource dependencies
import { http, HttpResponse } from "msw";
import userEvent from "@testing-library/user-event";
import { screen, within, waitFor } from "@testing-library/react";
import { it, expect, afterAll, describe, afterEach, beforeAll } from "vitest";

// local dependencies
import { setBackendReady } from "@/api/backendReady";
import { createMockServer } from "@/test/mockServer";
import { renderWithRouter } from "@/test/renderWithRouter";
import { CATALOG_SEARCH_DEFAULTS } from "@/features/catalog/catalogSearch";

const PAGE_SIZE = CATALOG_SEARCH_DEFAULTS.pageSize;

const { db, server } = createMockServer();

type P = (typeof db.products)[number];

// Mirror the controller's sort comparator exactly
function mirrorSort(products: readonly P[], sort: string, order: string): P[] {
    return [...products].sort((a, b) => {
        let cmp = 0;
        if (sort === "name") cmp = a.name.localeCompare(b.name);
        else if (sort === "sku") cmp = a.sku.localeCompare(b.sku);
        else if (sort === "quantity") cmp = a.quantity - b.quantity;
        else if (sort === "price") cmp = a.price - b.price;
        if (cmp === 0) cmp = a.id.localeCompare(b.id);
        return order === "asc" ? cmp : -cmp;
    });
}

// Mirror the controller's low-stock rule
function lowProducts(products: readonly P[]): P[] {
    return [...products].filter(
        (p) => p.quantity > 0 && p.quantity < p.minQuantity,
    );
}

// Returns the data rows from the products table (tbody rows only)
function getBodyRows(): HTMLElement[] {
    const rowgroups = screen.getAllByRole("rowgroup");
    return within(rowgroups[1]).getAllByRole("row");
}

beforeAll(() => server.listen({ onUnhandledFrame: "error" }));
afterAll(() => server.close());
afterEach(() => {
    server.resetHandlers();
    setBackendReady(Promise.resolve());
});

describe("Rendering", () => {
    it(`shows h2 All products, N products count, ${PAGE_SIZE} rows, first page in name-asc order`, async () => {
        const total = db.products.length;
        const sorted = mirrorSort(db.products, "name", "asc");
        await renderWithRouter("/catalog");

        expect(
            screen.getByRole("heading", { level: 2, name: "All products" }),
        ).toBeInTheDocument();

        await screen.findByText(`${total} products`);
        const rows = getBodyRows();
        expect(rows).toHaveLength(PAGE_SIZE);
        expect(rows[0]).toHaveTextContent(sorted[0].name);
        expect(rows[PAGE_SIZE - 1]).toHaveTextContent(
            sorted[PAGE_SIZE - 1].name,
        );
    });
});

describe("Sorting", () => {
    it("clicking Price sets aria-sort ascending on Price only and URL has sort=price", async () => {
        const user = userEvent.setup();
        const total = db.products.length;
        const priceSorted = mirrorSort(db.products, "price", "asc");
        const { router } = await renderWithRouter("/catalog");
        await screen.findByText(`${total} products`);

        await user.click(screen.getByRole("button", { name: /price/i }));

        await waitFor(() => {
            const rows = getBodyRows();
            expect(rows[0]).toHaveTextContent(priceSorted[0].name);
        });
        expect(
            screen.getByRole("columnheader", { name: /price/i }),
        ).toHaveAttribute("aria-sort", "ascending");
        expect(
            screen.getByRole("columnheader", { name: "Name" }),
        ).not.toHaveAttribute("aria-sort");
        expect(
            screen.getByRole("columnheader", { name: /sku/i }),
        ).not.toHaveAttribute("aria-sort");
        expect(
            screen.getByRole("columnheader", { name: /quantity/i }),
        ).not.toHaveAttribute("aria-sort");
        expect(router.state.location.searchStr).toContain("sort=price");
        // order=asc is stripped as default
        expect(router.state.location.searchStr).not.toContain("order=");
    });

    it("clicking Price again sets aria-sort descending and adds order=desc to URL", async () => {
        const user = userEvent.setup();
        const total = db.products.length;
        const priceSortedDesc = mirrorSort(db.products, "price", "desc");
        const { router } = await renderWithRouter("/catalog");
        await screen.findByText(`${total} products`);

        await user.click(screen.getByRole("button", { name: /price/i }));
        // Wait for first click to settle before second click
        await waitFor(() => {
            expect(router.state.location.searchStr).toContain("sort=price");
        });

        await user.click(screen.getByRole("button", { name: /price/i }));

        await waitFor(() => {
            const rows = getBodyRows();
            expect(rows[0]).toHaveTextContent(priceSortedDesc[0].name);
        });
        expect(
            screen.getByRole("columnheader", { name: /price/i }),
        ).toHaveAttribute("aria-sort", "descending");
        expect(router.state.location.searchStr).toContain("order=desc");
    });

    it("first click on Quantity sorts ascending (asc-first for numeric columns)", async () => {
        const user = userEvent.setup();
        const total = db.products.length;
        const quantitySorted = mirrorSort(db.products, "quantity", "asc");
        const { router } = await renderWithRouter("/catalog");
        await screen.findByText(`${total} products`);

        await user.click(screen.getByRole("button", { name: /quantity/i }));

        await waitFor(() => {
            const rows = getBodyRows();
            expect(rows[0]).toHaveTextContent(quantitySorted[0].name);
        });
        expect(
            screen.getByRole("columnheader", { name: /quantity/i }),
        ).toHaveAttribute("aria-sort", "ascending");
        expect(router.state.location.searchStr).toContain("sort=quantity");
        expect(router.state.location.searchStr).not.toContain("order=desc");
    });
});

describe("Search", () => {
    it("debounced search filters rows, updates count and URL with q, uses replace navigation", async () => {
        const user = userEvent.setup();
        const total = db.products.length;
        const sorted = mirrorSort(db.products, "name", "asc");
        // Derive a term from the first product that is unique enough
        const term = sorted[0].name.slice(0, 5).toLowerCase();
        const expectedMatches = db.products.filter(
            (p) =>
                p.name.toLowerCase().includes(term) ||
                p.sku.toLowerCase().includes(term),
        );
        const { router } = await renderWithRouter("/catalog");
        await screen.findByText(`${total} products`);

        const histBefore = router.history.length;
        const input = screen.getByRole("searchbox", {
            name: /search products/i,
        });
        await user.type(input, term);

        const countLabel =
            expectedMatches.length === 1
                ? "1 product"
                : `${expectedMatches.length} products`;
        await screen.findByText(countLabel);

        // Every visible row matches by name or SKU
        const rows = getBodyRows();
        for (const row of rows) {
            const text = (row.textContent ?? "").toLowerCase();
            expect(text).toContain(term);
        }

        expect(router.state.location.searchStr).toContain("q=");
        // replace navigation: history length is unchanged
        expect(router.history.length).toBe(histBefore);
    });

    it("Escape clears the input, removes q from URL and restores the full count", async () => {
        const user = userEvent.setup();
        const total = db.products.length;
        const sorted = mirrorSort(db.products, "name", "asc");
        const term = sorted[0].name.slice(0, 5).toLowerCase();
        const expectedMatches = db.products.filter(
            (p) =>
                p.name.toLowerCase().includes(term) ||
                p.sku.toLowerCase().includes(term),
        );
        const { router } = await renderWithRouter("/catalog");
        await screen.findByText(`${total} products`);

        const input = screen.getByRole("searchbox", {
            name: /search products/i,
        });
        await user.type(input, term);
        const countLabel =
            expectedMatches.length === 1
                ? "1 product"
                : `${expectedMatches.length} products`;
        await screen.findByText(countLabel);

        await user.keyboard("{Escape}");

        expect(input).toHaveValue("");
        await screen.findByText(`${total} products`);
        expect(router.state.location.searchStr).not.toContain("q=");
    });
});

describe("Stock filter", () => {
    it("clicking Low activates aria-pressed, every row has a Low badge, count matches db low rule", async () => {
        const user = userEvent.setup();
        const total = db.products.length;
        const low = lowProducts(db.products);
        await renderWithRouter("/catalog");
        await screen.findByText(`${total} products`);

        await user.click(screen.getByRole("button", { name: "Low" }));

        const countLabel =
            low.length === 1 ? "1 product" : `${low.length} products`;
        await screen.findByText(countLabel);

        expect(screen.getByRole("button", { name: "Low" })).toHaveAttribute(
            "aria-pressed",
            "true",
        );
        expect(screen.getByRole("button", { name: "All" })).toHaveAttribute(
            "aria-pressed",
            "false",
        );

        const rows = getBodyRows();
        expect(rows).toHaveLength(Math.min(low.length, PAGE_SIZE));
        for (const row of rows) {
            expect(within(row).getByText("Low")).toBeInTheDocument();
        }
    });

    it("clicking the already-pressed All on page 2 does not navigate", async () => {
        const user = userEvent.setup();
        const total = db.products.length;
        const { router } = await renderWithRouter("/catalog?page=2");
        await screen.findByText(
            `${PAGE_SIZE + 1}–${Math.min(PAGE_SIZE * 2, total)} of ${total}`,
        );

        const histBefore = router.history.length;
        // All is already selected (stock is undefined by default)
        expect(screen.getByRole("button", { name: "All" })).toHaveAttribute(
            "aria-pressed",
            "true",
        );

        await user.click(screen.getByRole("button", { name: "All" }));

        // No navigation: history length unchanged, still on page 2
        expect(router.history.length).toBe(histBefore);
        expect(router.state.location.searchStr).toContain("page=2");
    });
});

describe("Pagination", () => {
    it(`Next page shows range ${PAGE_SIZE + 1}–N of total, URL page=2; Previous disabled on page 1; Next disabled on last page`, async () => {
        const user = userEvent.setup();
        const total = db.products.length;
        const pageSize = PAGE_SIZE;
        const lastPage = Math.ceil(total / pageSize);
        const { router } = await renderWithRouter("/catalog");
        await screen.findByText(`${total} products`);

        expect(
            screen.getByRole("button", { name: "Previous page" }),
        ).toBeDisabled();
        expect(
            screen.getByRole("button", { name: "Next page" }),
        ).not.toBeDisabled();

        await user.click(screen.getByRole("button", { name: "Next page" }));
        await screen.findByText(
            `${PAGE_SIZE + 1}–${Math.min(PAGE_SIZE * 2, total)} of ${total}`,
        );
        expect(router.state.location.searchStr).toContain("page=2");

        // Navigate to last page by clicking Next repeatedly
        for (let p = 3; p <= lastPage; p++) {
            await user.click(screen.getByRole("button", { name: "Next page" }));
            const rangeStart = (p - 1) * pageSize + 1;
            const rangeEnd = Math.min(p * pageSize, total);
            await screen.findByText(`${rangeStart}–${rangeEnd} of ${total}`);
        }

        expect(
            screen.getByRole("button", { name: "Next page" }),
        ).toBeDisabled();
        expect(
            screen.getByRole("button", { name: "Previous page" }),
        ).not.toBeDisabled();
    });

    it("/catalog?page=999 redirects to the last page and shows its rows", async () => {
        const total = db.products.length;
        const lastPage = Math.ceil(total / PAGE_SIZE);
        const sorted = mirrorSort(db.products, "name", "asc");
        const lastPageProducts = sorted.slice((lastPage - 1) * PAGE_SIZE);

        const { router } = await renderWithRouter("/catalog?page=999");

        await waitFor(() => {
            expect(router.state.location.searchStr).toContain(
                `page=${lastPage}`,
            );
        });

        await waitFor(() => {
            expect(getBodyRows()[0]).toHaveTextContent(
                lastPageProducts[0].name,
            );
        });
        expect(getBodyRows()).toHaveLength(lastPageProducts.length);
    });

    it("Rows per page 50 shows up to 50 rows and resets page to 1", async () => {
        const user = userEvent.setup();
        const total = db.products.length;
        const { router } = await renderWithRouter("/catalog?page=2");
        await screen.findByText(
            `${PAGE_SIZE + 1}–${Math.min(PAGE_SIZE * 2, total)} of ${total}`,
        );

        await user.selectOptions(
            screen.getByRole("combobox", { name: /rows per page/i }),
            "50",
        );

        const expectedRows = Math.min(50, total);
        await screen.findByText(`1–${expectedRows} of ${total}`);
        expect(getBodyRows()).toHaveLength(expectedRows);
        // page=1 is stripped as default
        expect(router.state.location.searchStr).not.toContain("page=");
    });

    it("choosing Low on page 2 resets page to 1", async () => {
        const user = userEvent.setup();
        const total = db.products.length;
        const low = lowProducts(db.products);
        const { router } = await renderWithRouter("/catalog?page=2");
        await screen.findByText(
            `${PAGE_SIZE + 1}–${Math.min(PAGE_SIZE * 2, total)} of ${total}`,
        );

        await user.click(screen.getByRole("button", { name: "Low" }));

        const countLabel =
            low.length === 1 ? "1 product" : `${low.length} products`;
        await screen.findByText(countLabel);
        // page resets to 1 (stripped as default) and stock=low appears
        expect(router.state.location.searchStr).not.toContain("page=2");
        expect(router.state.location.searchStr).toContain("stock=low");
    });
});

describe("States", () => {
    it("empty search result shows message; Clear filters restores rows and clears URL params", async () => {
        const user = userEvent.setup();
        const total = db.products.length;
        const noMatchTerm = "xyzqwerty123";
        // Confirm the term matches nothing in the seed
        expect(
            db.products.filter(
                (p) =>
                    p.name.toLowerCase().includes(noMatchTerm) ||
                    p.sku.toLowerCase().includes(noMatchTerm),
            ),
        ).toHaveLength(0);

        const { router } = await renderWithRouter("/catalog");
        await screen.findByText(`${total} products`);

        const input = screen.getByRole("searchbox", {
            name: /search products/i,
        });
        await user.type(input, noMatchTerm);

        await screen.findByText("No products match the filters");
        expect(
            screen.getByRole("button", { name: "Clear filters" }),
        ).toBeInTheDocument();
        expect(router.state.location.searchStr).toContain("q=");

        await user.click(screen.getByRole("button", { name: "Clear filters" }));

        await screen.findByText(`${total} products`);
        expect(router.state.location.searchStr).not.toContain("q=");
        expect(router.state.location.searchStr).not.toContain("stock=");
        expect(getBodyRows()).toHaveLength(PAGE_SIZE);
    });

    it("error without data: shows alert with message and Retry; no table; Retry loads rows", async () => {
        server.use(
            http.get("/api/products", () =>
                HttpResponse.json(
                    {
                        error: {
                            code: "INTERNAL_ERROR",
                            message: "Internal server error",
                        },
                    },
                    { status: 500 },
                ),
            ),
        );

        const user = userEvent.setup();
        await renderWithRouter("/catalog");

        await screen.findByRole("alert");
        expect(screen.getByRole("alert")).toHaveTextContent(
            "Internal server error",
        );
        expect(
            screen.getByRole("button", { name: /retry/i }),
        ).toBeInTheDocument();
        expect(screen.queryByRole("table")).not.toBeInTheDocument();

        server.resetHandlers();
        await user.click(screen.getByRole("button", { name: /retry/i }));

        await screen.findByText(`${db.products.length} products`);
        expect(screen.getByRole("table")).toBeInTheDocument();
        expect(screen.queryByRole("alert")).not.toBeInTheDocument();
    });

    it("error with stale data: navigating to a new page that fails shows alert and Retry while previous rows stay in table", async () => {
        const user = userEvent.setup();
        const total = db.products.length;

        await renderWithRouter("/catalog");
        await screen.findByText(`${total} products`);
        // Confirm PAGE_SIZE rows loaded on page 1
        expect(getBodyRows()).toHaveLength(PAGE_SIZE);

        // All future /api/products requests now fail
        server.use(
            http.get("/api/products", () =>
                HttpResponse.json(
                    {
                        error: {
                            code: "INTERNAL_ERROR",
                            message: "Internal server error",
                        },
                    },
                    { status: 500 },
                ),
            ),
        );

        await user.click(screen.getByRole("button", { name: "Next page" }));

        // RTK Query keeps last successful `data` even when the new query errors,
        // so the table remains while the inline alert appears above it.
        await screen.findByRole("alert");
        expect(screen.getByRole("alert")).toHaveTextContent(
            "Internal server error",
        );
        expect(
            screen.getByRole("button", { name: /retry/i }),
        ).toBeInTheDocument();
        expect(screen.getByRole("table")).toBeInTheDocument();
        expect(getBodyRows()).toHaveLength(PAGE_SIZE);
    });
});
