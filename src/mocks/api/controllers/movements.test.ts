// outsource dependencies
import { it, expect, describe } from "vitest";

// local dependencies
import { createDb } from "../../db";
import { ApiError } from "../errors";
import { listMovements } from "./movements";
import { createMemoryStorage } from "../../db/storage";

const FIXED_NOW = new Date("2026-11-06T07:00:00Z");
const db = createDb({ storage: createMemoryStorage(), now: () => FIXED_NOW });

function q(
    overrides: Partial<Parameters<typeof listMovements>[0]["query"]> = {},
): Parameters<typeof listMovements>[0]["query"] {
    return { page: 1, pageSize: 20, order: "desc", ...overrides };
}

function offsetDay(dateStr: string, delta: number): string {
    const d = new Date(dateStr + "T00:00:00Z");
    d.setUTCDate(d.getUTCDate() + delta);
    return d.toISOString().slice(0, 10);
}

describe("listMovements", () => {
    describe("ordering", () => {
        it("items are sorted newest first (by date desc, id desc for ties)", () => {
            const result = listMovements({ db, query: q({ pageSize: 100 }) });
            const items = result.body.items;
            for (let i = 0; i < items.length - 1; i++) {
                const a = items[i].date;
                const b = items[i + 1].date;
                expect(a >= b).toBe(true);
                if (a === b) {
                    expect(items[i].id >= items[i + 1].id).toBe(true);
                }
            }
        });
    });

    describe("type filter", () => {
        it("returns only movements of the given type", () => {
            for (const type of [
                "receipt",
                "shipment",
                "write-off",
                "adjustment",
            ] as const) {
                const result = listMovements({
                    db,
                    query: q({ type, pageSize: 1000 }),
                });
                expect(result.body.items.every((m) => m.type === type)).toBe(
                    true,
                );
                const expected = db.movements.filter((m) => m.type === type);
                expect(result.body.total).toBe(expected.length);
            }
        });
    });

    describe("productId filter", () => {
        it("returns only movements for the given productId", () => {
            const pid = db.products[0].id;
            const result = listMovements({
                db,
                query: q({ productId: pid, pageSize: 1000 }),
            });
            expect(result.body.items.every((m) => m.productId === pid)).toBe(
                true,
            );
            const expected = db.movements.filter((m) => m.productId === pid);
            expect(result.body.total).toBe(expected.length);
        });

        it("throws a 404 ApiError for an unknown productId", () => {
            expect(() =>
                listMovements({
                    db,
                    query: q({ productId: "prd-does-not-exist" }),
                }),
            ).toThrow(ApiError);
            try {
                listMovements({
                    db,
                    query: q({ productId: "prd-does-not-exist" }),
                });
            } catch (e) {
                expect((e as ApiError).status).toBe(404);
            }
        });

        it("control: a known productId does not throw", () => {
            expect(() =>
                listMovements({
                    db,
                    query: q({ productId: db.products[0].id }),
                }),
            ).not.toThrow();
        });
    });

    describe("from / to date filters", () => {
        it("from and to are inclusive by day: movements on that exact day are included, neighbouring days excluded", () => {
            const dateGroups = new Map<string, number>();
            for (const m of db.movements) {
                const d = m.date.slice(0, 10);
                dateGroups.set(d, (dateGroups.get(d) ?? 0) + 1);
            }

            let targetDate: string | undefined;
            for (const date of [...dateGroups.keys()].sort()) {
                if (
                    dateGroups.has(offsetDay(date, -1)) &&
                    dateGroups.has(offsetDay(date, 1))
                ) {
                    targetDate = date;
                    break;
                }
            }
            expect(targetDate).toBeDefined();

            const result = listMovements({
                db,
                query: q({
                    from: targetDate!,
                    to: targetDate!,
                    pageSize: 1000,
                }),
            });

            expect(result.body.items.length).toBeGreaterThan(0);
            expect(
                result.body.items.every(
                    (m) => m.date.slice(0, 10) === targetDate,
                ),
            ).toBe(true);
            expect(
                result.body.items.some(
                    (m) => m.date.slice(0, 10) === offsetDay(targetDate!, -1),
                ),
            ).toBe(false);
            expect(
                result.body.items.some(
                    (m) => m.date.slice(0, 10) === offsetDay(targetDate!, 1),
                ),
            ).toBe(false);
        });

        it("from after to throws a 400 ApiError with fields on both from and to", () => {
            expect(() =>
                listMovements({
                    db,
                    query: q({ from: "2026-11-05", to: "2026-11-01" }),
                }),
            ).toThrow(ApiError);
            try {
                listMovements({
                    db,
                    query: q({ from: "2026-11-05", to: "2026-11-01" }),
                });
            } catch (e) {
                const err = e as ApiError;
                expect(err.status).toBe(400);
                expect(err.fields).toHaveProperty("from");
                expect(err.fields).toHaveProperty("to");
            }
        });

        it("control: from equal to to does not throw", () => {
            expect(() =>
                listMovements({
                    db,
                    query: q({ from: "2026-10-01", to: "2026-10-01" }),
                }),
            ).not.toThrow();
        });
    });

    describe("product and supplier enrichment", () => {
        it("product and supplier in each item match the db", () => {
            const result = listMovements({ db, query: q({ pageSize: 100 }) });
            const productMap = new Map(db.products.map((p) => [p.id, p]));
            const supplierMap = new Map(db.suppliers.map((s) => [s.id, s]));

            for (const item of result.body.items) {
                const p = productMap.get(item.productId)!;
                expect(item.product).toEqual({
                    id: p.id,
                    name: p.name,
                    sku: p.sku,
                    unit: p.unit,
                });
                if (item.supplierId) {
                    const s = supplierMap.get(item.supplierId)!;
                    expect(item.supplier).toEqual({ id: s.id, name: s.name });
                } else {
                    expect(item.supplier).toBeNull();
                }
            }
        });
    });
});
