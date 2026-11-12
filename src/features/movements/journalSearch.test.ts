// outsource dependencies
import { it, expect, describe } from "vitest";

// local dependencies
import {
    hasActiveFilters,
    activeFilterCount,
    journalSearchSchema,
    JOURNAL_SEARCH_DEFAULTS,
} from "./journalSearch";

describe("journalSearchSchema", () => {
    describe("defaults", () => {
        it("empty input returns defaults with no filter keys", () => {
            const result = journalSearchSchema.parse({});
            expect(result.order).toBe("desc");
            expect(result.page).toBe(1);
            expect(result.pageSize).toBe(JOURNAL_SEARCH_DEFAULTS.pageSize);
            expect(result.from).toBeUndefined();
            expect(result.to).toBeUndefined();
            expect(result.type).toBeUndefined();
            expect(result.productId).toBeUndefined();
        });
    });

    describe("invalid value coercion", () => {
        it("invalid type, from, page, pageSize, productId are dropped to defaults", () => {
            const result = journalSearchSchema.parse({
                type: "foo",
                from: "not-a-date",
                page: 0,
                pageSize: 500,
                productId: "",
            });
            expect(result.type).toBeUndefined();
            expect(result.from).toBeUndefined();
            expect(result.page).toBe(1);
            expect(result.pageSize).toBe(10);
            expect(result.productId).toBeUndefined();
        });
    });

    describe("date range normalization", () => {
        it("from > to: to is dropped, from is kept", () => {
            const result = journalSearchSchema.parse({
                from: "2026-11-12",
                to: "2026-11-01",
            });
            expect(result.from).toBe("2026-11-12");
            expect(result.to).toBeUndefined();
        });

        it("from === to: both are kept", () => {
            const result = journalSearchSchema.parse({
                from: "2026-11-12",
                to: "2026-11-12",
            });
            expect(result.from).toBe("2026-11-12");
            expect(result.to).toBe("2026-11-12");
        });
    });
});

describe("activeFilterCount", () => {
    it("no filters: 0", () => {
        expect(activeFilterCount(journalSearchSchema.parse({}))).toBe(0);
    });

    it("only from: 1", () => {
        expect(
            activeFilterCount(
                journalSearchSchema.parse({ from: "2026-11-01" }),
            ),
        ).toBe(1);
    });

    it("from + to: 1 (counted as one date range)", () => {
        expect(
            activeFilterCount(
                journalSearchSchema.parse({
                    from: "2026-11-01",
                    to: "2026-11-12",
                }),
            ),
        ).toBe(1);
    });

    it("from + type + productId: 3", () => {
        expect(
            activeFilterCount(
                journalSearchSchema.parse({
                    from: "2026-11-01",
                    type: "receipt",
                    productId: "p1",
                }),
            ),
        ).toBe(3);
    });
});

describe("hasActiveFilters", () => {
    it("only order/page/pageSize set: false", () => {
        const result = journalSearchSchema.parse({
            order: "asc",
            page: 2,
            pageSize: 20,
        });
        expect(hasActiveFilters(result)).toBe(false);
    });

    it("type set: true", () => {
        const result = journalSearchSchema.parse({ type: "receipt" });
        expect(hasActiveFilters(result)).toBe(true);
    });
});
