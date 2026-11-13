// outsource dependencies
import { http, HttpResponse } from "msw";
import userEvent from "@testing-library/user-event";
import { screen, within, waitFor } from "@testing-library/react";
import { it, expect, afterAll, describe, afterEach, beforeAll } from "vitest";

// local dependencies
import { stockStatus } from "@/domain";
import { makeStore } from "@/store/store";
import { toLocalIsoDate } from "@/lib/date";
import { setBackendReady } from "@/api/backendReady";
import { createMockServer } from "@/test/mockServer";
import { receiptsApi } from "@/api/endpoints/receipts";
import { renderWithRouter } from "@/test/renderWithRouter";
import { formatPrice } from "@/features/products-table/helpers";

const FIXED_NOW = new Date("2026-11-06T07:00:00Z");
const { db, server } = createMockServer();

type Mov = (typeof db.movements)[number];

function mirrorSort(movements: readonly Mov[], order: "asc" | "desc"): Mov[] {
    return [...movements].sort((a, b) => {
        const sign = order === "asc" ? 1 : -1;
        const dateCmp = a.date.localeCompare(b.date);
        if (dateCmp !== 0) return sign * dateCmp;
        return sign * a.id.localeCompare(b.id);
    });
}

function computeExpectedFlows(extra?: { productId: string; qty: number }) {
    const products = [...db.products];
    const movements = [...db.movements];
    const priceMap = new Map(products.map((p) => [p.id, p.price]));

    const dates: string[] = [];
    for (let i = 29; i >= 0; i--) {
        const d = new Date(FIXED_NOW);
        d.setDate(d.getDate() - i);
        dates.push(toLocalIsoDate(d));
    }
    const dateSet = new Set(dates);

    const inflowMap = new Map<string, number>(dates.map((d) => [d, 0]));
    const outflowMap = new Map<string, number>(dates.map((d) => [d, 0]));

    for (const m of movements) {
        if (m.type === "adjustment") continue;
        const localDate = toLocalIsoDate(new Date(m.date));
        if (!dateSet.has(localDate)) continue;
        const price = priceMap.get(m.productId) ?? 0;
        if (m.type === "receipt") {
            inflowMap.set(
                localDate,
                (inflowMap.get(localDate) ?? 0) + m.quantity * price,
            );
        } else if (m.type === "shipment" || m.type === "write-off") {
            outflowMap.set(
                localDate,
                (outflowMap.get(localDate) ?? 0) + Math.abs(m.quantity) * price,
            );
        }
    }

    if (extra !== undefined) {
        const receiptDate = toLocalIsoDate(FIXED_NOW);
        if (dateSet.has(receiptDate)) {
            const price = priceMap.get(extra.productId) ?? 0;
            inflowMap.set(
                receiptDate,
                (inflowMap.get(receiptDate) ?? 0) + extra.qty * price,
            );
        }
    }

    let totalInflow = 0;
    let totalOutflow = 0;
    for (const d of dates) {
        totalInflow += Math.round(inflowMap.get(d) ?? 0);
        totalOutflow += Math.round(outflowMap.get(d) ?? 0);
    }
    return { totalInflow, totalOutflow };
}

function computeRunningLow() {
    return [...db.products]
        .filter((p) => {
            const s = stockStatus(p);
            return s === "low" || s === "out";
        })
        .sort((a, b) => {
            const ratioA = a.minQuantity === 0 ? 0 : a.quantity / a.minQuantity;
            const ratioB = b.minQuantity === 0 ? 0 : b.quantity / b.minQuantity;
            if (ratioA !== ratioB) return ratioA - ratioB;
            return a.name.localeCompare(b.name);
        })
        .slice(0, 5);
}

beforeAll(() => server.listen({ onUnhandledFrame: "error" }));
afterAll(() => server.close());
afterEach(() => {
    server.resetHandlers();
    db.reset();
    setBackendReady(Promise.resolve());
});

describe("Metrics", () => {
    it("shows stock value, low stock count, out of stock count and product count", async () => {
        const products = [...db.products];
        const rawStockValue = products.reduce(
            (sum, p) => sum + p.quantity * p.price,
            0,
        );
        const expectedStockValue = formatPrice(Math.round(rawStockValue));
        const expectedLow = products.filter(
            (p) => stockStatus(p) === "low",
        ).length;
        const expectedOut = products.filter(
            (p) => stockStatus(p) === "out",
        ).length;
        const expectedCount = products.length;

        await renderWithRouter("/dashboard");

        await screen.findByText(expectedStockValue);
        expect(
            screen.getByRole("link", { name: /low stock/i }),
        ).toHaveTextContent(String(expectedLow));
        expect(
            screen.getByRole("link", { name: /out of stock/i }),
        ).toHaveTextContent(String(expectedOut));
        expect(
            screen.getByRole("link", { name: /products/i }),
        ).toHaveTextContent(String(expectedCount));
    });
});

describe("Navigation", () => {
    it("clicking the Low stock card navigates to /catalog with stock=low in the URL and shows the catalog heading", async () => {
        const user = userEvent.setup();
        const products = [...db.products];
        const expectedLow = products.filter(
            (p) => stockStatus(p) === "low",
        ).length;

        const { router } = await renderWithRouter("/dashboard");
        await screen.findByText(String(expectedLow));

        await user.click(screen.getByRole("link", { name: /low stock/i }));

        await screen.findByRole("heading", { name: "Catalog" });
        expect(router.state.location.searchStr).toContain("stock=low");
    });
});

describe("Running low", () => {
    it("lists expected product names in correct order and first item links to catalog with the product's SKU", async () => {
        const expectedRunningLow = computeRunningLow();

        await renderWithRouter("/dashboard");

        const section = screen
            .getByRole("heading", { name: /running low/i })
            .closest("section")!;
        await within(section).findByText(expectedRunningLow[0].name);
        const items = within(section).getAllByRole("listitem");
        expect(
            items.map((item) => within(item).getByRole("link").textContent),
        ).toEqual(expectedRunningLow.map((p) => p.name));

        const firstLink = within(items[0]).getByRole("link");
        expect(firstLink.getAttribute("href")).toContain(
            expectedRunningLow[0].sku,
        );
    });
});

describe("Recent movements", () => {
    it("shows 5 items; first is the newest movement's product; View all navigates to /movements", async () => {
        const user = userEvent.setup();
        const sorted = mirrorSort(db.movements, "desc");
        const productMap = new Map(db.products.map((p) => [p.id, p]));
        const newestProductName =
            productMap.get(sorted[0].productId)?.name ?? "";

        await renderWithRouter("/dashboard");

        const section = screen
            .getByRole("heading", { name: /recent movements/i })
            .closest("section")!;
        await within(section).findByText(newestProductName);
        const items = within(section).getAllByRole("listitem");
        expect(items).toHaveLength(5);
        expect(items[0]).toHaveTextContent(newestProductName);

        await user.click(
            within(section).getByRole("link", { name: /view all/i }),
        );
        await screen.findByRole("heading", { level: 1, name: "Movements" });
    });
});

describe("Chart", () => {
    it("img element has an aria-label with the 30-day inflow and outflow totals", async () => {
        const { totalInflow, totalOutflow } = computeExpectedFlows();
        const expectedLabel = `Inflow and outflow over the last 30 days: inflow ${formatPrice(totalInflow)}, outflow ${formatPrice(totalOutflow)}`;

        await renderWithRouter("/dashboard");

        await screen.findByRole("img", { name: expectedLabel });
    });
});

describe("Error handling", () => {
    it("dashboard 500: metrics, running low and chart show Retry alerts; recent movements renders; Retry reloads metrics", async () => {
        server.use(
            http.get("/api/dashboard", () =>
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
        await renderWithRouter("/dashboard");

        const retryButtons = await screen.findAllByRole("button", {
            name: "Retry",
        });
        expect(retryButtons).toHaveLength(3);

        const runningLowSection = screen
            .getByRole("heading", { name: /running low/i })
            .closest("section")!;
        expect(
            within(runningLowSection).getByRole("alert"),
        ).toBeInTheDocument();

        const chartSection = screen
            .getByRole("heading", { name: /inflow and outflow/i })
            .closest("section")!;
        expect(within(chartSection).getByRole("alert")).toBeInTheDocument();

        const recentSection = screen
            .getByRole("heading", { name: /recent movements/i })
            .closest("section")!;
        expect(
            within(recentSection).queryByRole("alert"),
        ).not.toBeInTheDocument();
        const movItems = await within(recentSection).findAllByRole("listitem");
        expect(movItems).toHaveLength(5);

        server.resetHandlers();
        await user.click(retryButtons[0]);

        const products = [...db.products];
        const expectedStockValue = formatPrice(
            Math.round(
                products.reduce((sum, p) => sum + p.quantity * p.price, 0),
            ),
        );
        await screen.findByText(expectedStockValue);
    });
});

describe("Invalidation", () => {
    it("posting a receipt updates stock value and chart aria-label without navigating", async () => {
        const products = [...db.products];
        const product = products.find((p) => !p.perishable);
        expect(product).toBeDefined();
        if (product === undefined) return;

        const qty = 10;

        const originalStockValue = formatPrice(
            Math.round(
                products.reduce((sum, p) => sum + p.quantity * p.price, 0),
            ),
        );

        const newStockValue = formatPrice(
            Math.round(
                products.reduce(
                    (sum, p) =>
                        sum +
                        (p.id === product.id
                            ? (p.quantity + qty) * p.price
                            : p.quantity * p.price),
                    0,
                ),
            ),
        );

        const { totalInflow: newTotalInflow, totalOutflow: newTotalOutflow } =
            computeExpectedFlows({ productId: product.id, qty });

        const newExpectedLabel = `Inflow and outflow over the last 30 days: inflow ${formatPrice(newTotalInflow)}, outflow ${formatPrice(newTotalOutflow)}`;

        const store = makeStore();
        await renderWithRouter("/dashboard", { store });

        await screen.findByText(originalStockValue);

        await store.dispatch(
            receiptsApi.endpoints.postReceipt.initiate({
                supplierId: db.suppliers[0].id,
                invoiceNumber: "RCP-INV-DASH-001",
                date: toLocalIsoDate(FIXED_NOW),
                lines: [
                    {
                        productId: product.id,
                        expectedQuantity: qty,
                        actualQuantity: qty,
                    },
                ],
            }),
        );

        await screen.findByText(newStockValue);

        await waitFor(() => {
            expect(
                screen.getByRole("img", { name: /inflow and outflow/i }),
            ).toHaveAttribute("aria-label", newExpectedLabel);
        });
    });
});
