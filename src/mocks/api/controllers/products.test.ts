// outsource dependencies
import { it, expect, describe } from "vitest";

// local dependencies
import { createDb } from "../../db";
import { ApiError } from "../errors";
import { getProduct, listProducts } from "./products";
import { createMemoryStorage } from "../../db/storage";

const FIXED_NOW = new Date("2026-11-06T07:00:00Z");
const db = createDb({ storage: createMemoryStorage(), now: () => FIXED_NOW });

function query(
    overrides: Partial<Parameters<typeof listProducts>[0]["query"]> = {},
): Parameters<typeof listProducts>[0]["query"] {
    return {
        page: 1,
        pageSize: 20,
        sort: "name",
        order: "asc",
        includeDescendants: true,
        ...overrides,
    };
}

describe("listProducts", () => {
    describe("total", () => {
        it("total equals the number of matching products (no filters: all products)", () => {
            const result = listProducts({ db, query: query({ pageSize: 1 }) });
            expect(result.body.total).toBe(db.products.length);
        });
    });

    describe("pagination", () => {
        it("pages do not overlap and together cover all items", () => {
            const pageSize = 7;
            const total = db.products.length;
            const seenIds = new Set<string>();
            for (let page = 1; page <= Math.ceil(total / pageSize); page++) {
                const result = listProducts({
                    db,
                    query: query({ page, pageSize }),
                });
                expect(result.body.total).toBe(total);
                for (const p of result.body.items) {
                    expect(seenIds.has(p.id)).toBe(false);
                    seenIds.add(p.id);
                }
            }
            expect(seenIds.size).toBe(total);
        });

        it("a page beyond the last has empty items and the real total", () => {
            const total = db.products.length;
            const pageSize = 20;
            const beyondPage = Math.ceil(total / pageSize) + 1;
            const result = listProducts({
                db,
                query: query({ page: beyondPage, pageSize }),
            });
            expect(result.body.items).toHaveLength(0);
            expect(result.body.total).toBe(total);
        });
    });

    describe("sorting", () => {
        it("items are ordered correctly for each sort field and order, with ties broken by id asc", () => {
            const sortFields = ["name", "sku", "quantity", "price"] as const;
            const orders = ["asc", "desc"] as const;
            for (const sort of sortFields) {
                for (const order of orders) {
                    const result = listProducts({
                        db,
                        query: query({ sort, order, pageSize: 200 }),
                    });
                    const items = result.body.items;
                    for (let i = 0; i < items.length - 1; i++) {
                        const a = items[i];
                        const b = items[i + 1];
                        let fieldCmp: number;
                        switch (sort) {
                            case "name":
                                fieldCmp = a.name.localeCompare(b.name);
                                break;
                            case "sku":
                                fieldCmp = a.sku.localeCompare(b.sku);
                                break;
                            case "quantity":
                                fieldCmp = a.quantity - b.quantity;
                                break;
                            case "price":
                                fieldCmp = a.price - b.price;
                                break;
                        }
                        const normalised =
                            order === "asc" ? fieldCmp : -fieldCmp;
                        if (normalised === 0) {
                            const idNorm =
                                order === "asc"
                                    ? a.id.localeCompare(b.id)
                                    : b.id.localeCompare(a.id);
                            expect(idNorm).toBeLessThanOrEqual(0);
                        } else {
                            expect(normalised).toBeLessThanOrEqual(0);
                        }
                    }
                }
            }
        });
    });

    describe("includeDescendants", () => {
        it("false and true differ for a non-leaf category that has direct products", () => {
            const childIds = new Set(
                db.categories
                    .filter((c) => c.parentId !== null)
                    .map((c) => c.parentId!),
            );
            const nonLeafWithDirect = db.categories.find(
                (c) =>
                    childIds.has(c.id) &&
                    db.products.some((p) => p.categoryId === c.id),
            );
            expect(nonLeafWithDirect).toBeDefined();
            const catId = nonLeafWithDirect!.id;

            const withoutDesc = listProducts({
                db,
                query: query({
                    categoryId: catId,
                    includeDescendants: false,
                    pageSize: 200,
                }),
            });
            const withDesc = listProducts({
                db,
                query: query({
                    categoryId: catId,
                    includeDescendants: true,
                    pageSize: 200,
                }),
            });

            const directIds = db.products
                .filter((p) => p.categoryId === catId)
                .map((p) => p.id)
                .sort();
            expect(withoutDesc.body.items.map((p) => p.id).sort()).toEqual(
                directIds,
            );
            expect(withDesc.body.total).toBeGreaterThan(withoutDesc.body.total);
        });
    });

    describe("categoryId validation", () => {
        it("an unknown categoryId throws a 404 ApiError", () => {
            expect(() =>
                listProducts({
                    db,
                    query: query({ categoryId: "cat-does-not-exist" }),
                }),
            ).toThrow(ApiError);
            try {
                listProducts({
                    db,
                    query: query({ categoryId: "cat-does-not-exist" }),
                });
            } catch (e) {
                expect((e as ApiError).status).toBe(404);
            }
        });

        it("control: a known categoryId does not throw", () => {
            expect(() =>
                listProducts({
                    db,
                    query: query({ categoryId: "cat-frozen" }),
                }),
            ).not.toThrow();
        });
    });

    describe("search query q", () => {
        it("q matches a sku case-insensitively", () => {
            const result = listProducts({
                db,
                query: query({ q: "che-hard", pageSize: 200 }),
            });
            const expected = db.products.filter(
                (p) =>
                    p.sku.toLowerCase().includes("che-hard") ||
                    p.name.toLowerCase().includes("che-hard"),
            );
            expect(result.body.total).toBe(expected.length);
            expect(result.body.total).toBeGreaterThan(0);
        });

        it("control: q that matches nothing gives total 0", () => {
            const result = listProducts({
                db,
                query: query({ q: "ZZZNOMATCH999XYZ" }),
            });
            expect(result.body.total).toBe(0);
        });
    });

    describe("stock filter", () => {
        it("stock 'out' returns exactly the products with quantity 0", () => {
            const result = listProducts({
                db,
                query: query({ stock: "out", pageSize: 200 }),
            });
            const expected = db.products.filter((p) => p.quantity === 0);
            expect(result.body.total).toBe(expected.length);
            expect(result.body.items.every((p) => p.quantity === 0)).toBe(true);
        });

        it("stock 'low' returns exactly the products with 0 < quantity < minQuantity", () => {
            const result = listProducts({
                db,
                query: query({ stock: "low", pageSize: 200 }),
            });
            const expected = db.products.filter(
                (p) => p.quantity > 0 && p.quantity < p.minQuantity,
            );
            expect(result.body.total).toBe(expected.length);
            expect(
                result.body.items.every(
                    (p) => p.quantity > 0 && p.quantity < p.minQuantity,
                ),
            ).toBe(true);
        });
    });
});

describe("getProduct", () => {
    it("returns the product for a known id", () => {
        const p = db.products[0];
        const result = getProduct({ db, params: { id: p.id } });
        expect(result.body).toEqual(p);
    });

    it("throws a 404 ApiError for an unknown id", () => {
        expect(() =>
            getProduct({ db, params: { id: "prd-does-not-exist" } }),
        ).toThrow(ApiError);
        try {
            getProduct({ db, params: { id: "prd-does-not-exist" } });
        } catch (e) {
            expect((e as ApiError).status).toBe(404);
        }
    });
});
