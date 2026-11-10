// outsource dependencies
import { it, expect, describe } from "vitest";

// local dependencies
import {
    toProductsParams,
    catalogSearchSchema,
    CATALOG_SEARCH_DEFAULTS,
} from "./catalogSearch";

describe("catalogSearchSchema", () => {
    describe("empty input produces all defaults", () => {
        const result = catalogSearchSchema.parse({});

        it("defaults sort to 'name'", () => {
            expect(result.sort).toBe("name");
        });

        it("defaults order to 'asc'", () => {
            expect(result.order).toBe("asc");
        });

        it("defaults page to 1", () => {
            expect(result.page).toBe(1);
        });

        it("defaults pageSize to 20", () => {
            expect(result.pageSize).toBe(20);
        });

        it("leaves optional fields undefined", () => {
            expect(result.q).toBeUndefined();
            expect(result.stock).toBeUndefined();
            expect(result.categoryId).toBeUndefined();
        });
    });

    describe("valid values pass through", () => {
        it("accepts valid sort and order values", () => {
            const result = catalogSearchSchema.parse({
                sort: "sku",
                order: "desc",
            });
            expect(result.sort).toBe("sku");
            expect(result.order).toBe("desc");
        });

        it("valid stock enum values pass through", () => {
            expect(catalogSearchSchema.parse({ stock: "low" }).stock).toBe(
                "low",
            );
            expect(catalogSearchSchema.parse({ stock: "out" }).stock).toBe(
                "out",
            );
        });

        it("numeric string page is coerced to number", () => {
            expect(catalogSearchSchema.parse({ page: "5" }).page).toBe(5);
        });

        it("numeric string pageSize is coerced to number", () => {
            expect(catalogSearchSchema.parse({ pageSize: "50" }).pageSize).toBe(
                50,
            );
        });

        it("categoryId string passes through", () => {
            expect(
                catalogSearchSchema.parse({ categoryId: "cat-1" }).categoryId,
            ).toBe("cat-1");
        });
    });

    describe("invalid values fall back to defaults without throwing", () => {
        it("page 'abc' → 1", () => {
            expect(catalogSearchSchema.parse({ page: "abc" }).page).toBe(1);
        });

        it("page 0 → 1", () => {
            expect(catalogSearchSchema.parse({ page: 0 }).page).toBe(1);
        });

        it("page -1 → 1", () => {
            expect(catalogSearchSchema.parse({ page: -1 }).page).toBe(1);
        });

        it("page 1.5 → 1", () => {
            expect(catalogSearchSchema.parse({ page: 1.5 }).page).toBe(1);
        });

        it("pageSize 0 → 20", () => {
            expect(catalogSearchSchema.parse({ pageSize: 0 }).pageSize).toBe(
                20,
            );
        });

        it("pageSize 101 → 20", () => {
            expect(catalogSearchSchema.parse({ pageSize: 101 }).pageSize).toBe(
                20,
            );
        });

        it("sort 'foo' → 'name'", () => {
            expect(catalogSearchSchema.parse({ sort: "foo" }).sort).toBe(
                "name",
            );
        });

        it("order 'up' → 'asc'", () => {
            expect(catalogSearchSchema.parse({ order: "up" }).order).toBe(
                "asc",
            );
        });

        it("stock 'foo' → undefined", () => {
            expect(
                catalogSearchSchema.parse({ stock: "foo" }).stock,
            ).toBeUndefined();
        });
    });

    describe("q field", () => {
        it("trims surrounding whitespace", () => {
            expect(catalogSearchSchema.parse({ q: "  hello  " }).q).toBe(
                "hello",
            );
        });

        it("whitespace-only q becomes undefined", () => {
            expect(catalogSearchSchema.parse({ q: "   " }).q).toBeUndefined();
        });

        it("empty string q becomes undefined", () => {
            expect(catalogSearchSchema.parse({ q: "" }).q).toBeUndefined();
        });
    });

    it("CATALOG_SEARCH_DEFAULTS equals schema output defaults for {}", () => {
        const { sort, order, page, pageSize } = catalogSearchSchema.parse({});
        expect({ sort, order, page, pageSize }).toEqual(
            CATALOG_SEARCH_DEFAULTS,
        );
    });
});

describe("toProductsParams", () => {
    it("maps all search fields 1:1 to params", () => {
        const search = catalogSearchSchema.parse({
            sort: "price",
            order: "desc",
            page: "2",
            pageSize: "10",
            q: "widget",
            stock: "low",
            categoryId: "cat-5",
        });
        const params = toProductsParams(search);
        expect(params.sort).toBe("price");
        expect(params.order).toBe("desc");
        expect(params.page).toBe(2);
        expect(params.pageSize).toBe(10);
        expect(params.q).toBe("widget");
        expect(params.stock).toBe("low");
        expect(params.categoryId).toBe("cat-5");
    });

    it("always sets includeDescendants to true", () => {
        expect(
            toProductsParams(catalogSearchSchema.parse({})).includeDescendants,
        ).toBe(true);
    });

    it("does not set a value for fields that are undefined in the input", () => {
        const params = toProductsParams(catalogSearchSchema.parse({}));
        expect(params.stock).toBeUndefined();
        expect(params.q).toBeUndefined();
        expect(params.categoryId).toBeUndefined();
    });
});
