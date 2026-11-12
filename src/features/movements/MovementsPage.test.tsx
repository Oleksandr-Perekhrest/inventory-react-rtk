// outsource dependencies
import userEvent from "@testing-library/user-event";
import { screen, within, waitFor } from "@testing-library/react";
import { it, expect, afterAll, describe, afterEach, beforeAll } from "vitest";

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

beforeAll(() => server.listen({ onUnhandledFrame: "error" }));
afterAll(() => server.close());
afterEach(() => {
    server.resetHandlers();
    setBackendReady(Promise.resolve());
});

describe("Default view", () => {
    it(`shows h1 "Movements", total count, ${PAGE_SIZE} body rows, first row is newest movement`, async () => {
        const total = db.movements.length;
        const sorted = mirrorSort(db.movements, "desc");
        const productMap = new Map(db.products.map((p) => [p.id, p]));
        const newestProductName =
            productMap.get(sorted[0].productId)?.name ?? "";

        await renderWithRouter("/movements");

        expect(
            screen.getByRole("heading", { level: 1, name: "Movements" }),
        ).toBeInTheDocument();
        await screen.findByText(formatCount(total));
        const rows = getBodyRows();
        expect(rows).toHaveLength(PAGE_SIZE);
        expect(rows[0]).toHaveTextContent(newestProductName);
    });
});

describe("Date sort", () => {
    it("Date header starts descending; click sets order=asc and oldest first; click again removes order from URL", async () => {
        const user = userEvent.setup();
        const total = db.movements.length;
        const sortedAsc = mirrorSort(db.movements, "asc");
        const productMap = new Map(db.products.map((p) => [p.id, p]));
        const oldestProductName =
            productMap.get(sortedAsc[0].productId)?.name ?? "";

        const { router } = await renderWithRouter("/movements");
        await screen.findByText(formatCount(total));

        expect(
            screen.getByRole("columnheader", { name: /date/i }),
        ).toHaveAttribute("aria-sort", "descending");

        await user.click(
            screen.getByRole("button", { name: "Date, sorted newest first" }),
        );

        await waitFor(() => {
            expect(getBodyRows()[0]).toHaveTextContent(oldestProductName);
        });
        expect(router.state.location.searchStr).toContain("order=asc");
        expect(
            screen.getByRole("columnheader", { name: /date/i }),
        ).toHaveAttribute("aria-sort", "ascending");

        await user.click(
            screen.getByRole("button", { name: "Date, sorted oldest first" }),
        );

        await waitFor(() => {
            expect(router.state.location.searchStr).not.toContain("order=");
        });
        expect(
            screen.getByRole("columnheader", { name: /date/i }),
        ).toHaveAttribute("aria-sort", "descending");
    });
});

describe("Pagination resets", () => {
    it("Next page shows page 2 range; switching type resets page, filters count and rows", async () => {
        const user = userEvent.setup();
        const total = db.movements.length;
        const shipmentCount = db.movements.filter(
            (m) => m.type === "shipment",
        ).length;

        const { router } = await renderWithRouter("/movements");
        await screen.findByText(formatCount(total));

        await user.click(screen.getByRole("button", { name: "Next page" }));

        const rangeEnd = Math.min(PAGE_SIZE * 2, total);
        await screen.findByText(`${PAGE_SIZE + 1}–${rangeEnd} of ${total}`);
        expect(router.state.location.searchStr).toContain("page=2");

        await user.click(screen.getByRole("button", { name: "Shipment" }));

        await screen.findByText(formatCount(shipmentCount));
        expect(router.state.location.searchStr).not.toContain("page=");
        expect(router.state.location.searchStr).toContain("type=shipment");
        const rows = getBodyRows();
        for (const row of rows) {
            expect(within(row).getByText("shipment")).toBeInTheDocument();
        }
    });
});

describe("Clear filters", () => {
    it("Clear filters from ?type=receipt&page=2 removes type and page from URL and restores total count", async () => {
        const user = userEvent.setup();
        const total = db.movements.length;

        const { router } = await renderWithRouter(
            "/movements?type=receipt&page=2",
        );
        await screen.findByRole("button", { name: "Clear filters" });

        await user.click(screen.getByRole("button", { name: "Clear filters" }));

        await screen.findByText(formatCount(total));
        expect(router.state.location.searchStr).not.toContain("type=");
        expect(router.state.location.searchStr).not.toContain("page=");
    });
});

describe("Invalid URL", () => {
    it("?type=foo&pageSize=500&page=0 renders default view and URL has no type, pageSize or page", async () => {
        const total = db.movements.length;

        const { router } = await renderWithRouter(
            "/movements?type=foo&pageSize=500&page=0",
        );

        await screen.findByText(formatCount(total));
        expect(getBodyRows()).toHaveLength(PAGE_SIZE);
        expect(screen.getByRole("button", { name: "All" })).toHaveAttribute(
            "aria-pressed",
            "true",
        );
        await waitFor(() => {
            expect(router.state.location.searchStr).not.toContain("type=");
            expect(router.state.location.searchStr).not.toContain("pageSize=");
            expect(router.state.location.searchStr).not.toContain("page=");
        });
    });
});
