// outsource dependencies
import { it, expect, describe, beforeEach } from "vitest";

// local dependencies
import { createDb } from "../../db";
import { getDashboard } from "./dashboard";
import { stockStatus } from "../../../domain";
import { toLocalIsoDate } from "../../../lib/date";
import { createMemoryStorage } from "../../db/storage";

const FIXED_NOW = new Date("2026-11-06T07:00:00Z");
const db = createDb({ storage: createMemoryStorage(), now: () => FIXED_NOW });

describe("getDashboard", () => {
    it("stockValue equals Math.round of sum(quantity * price) and productCount equals number of products", () => {
        const result = getDashboard({ db });
        const products = [...db.products];

        const expectedStockValue = Math.round(
            products.reduce((sum, p) => sum + p.quantity * p.price, 0),
        );

        expect(result.body.stockValue).toBe(expectedStockValue);
        expect(result.body.productCount).toBe(products.length);
    });

    it("lowStockCount and outOfStockCount equal the counts by stockStatus", () => {
        const result = getDashboard({ db });
        const products = [...db.products];

        const expectedLow = products.filter(
            (p) => stockStatus(p) === "low",
        ).length;
        const expectedOut = products.filter(
            (p) => stockStatus(p) === "out",
        ).length;

        expect(result.body.lowStockCount).toBe(expectedLow);
        expect(result.body.outOfStockCount).toBe(expectedOut);
    });

    it("runningLow ids on seed db equal the first Math.min(5, low + out) independently sorted products", () => {
        const result = getDashboard({ db });
        const products = [...db.products];

        const eligible = products
            .filter((p) => {
                const s = stockStatus(p);
                return s === "low" || s === "out";
            })
            .sort((a, b) => {
                const ratioA =
                    a.minQuantity === 0 ? 0 : a.quantity / a.minQuantity;
                const ratioB =
                    b.minQuantity === 0 ? 0 : b.quantity / b.minQuantity;
                if (ratioA !== ratioB) return ratioA - ratioB;
                return a.name.localeCompare(b.name);
            });

        const expectedIds = eligible
            .slice(0, Math.min(5, eligible.length))
            .map((p) => p.id);

        expect(result.body.runningLow.map((p) => p.id)).toEqual(expectedIds);
    });

    it("daily has exactly 30 entries with consecutive local dates oldest first, last equals toLocalIsoDate of now", () => {
        const result = getDashboard({ db });
        const { daily } = result.body;

        expect(daily).toHaveLength(30);
        expect(daily[daily.length - 1].date).toBe(toLocalIsoDate(FIXED_NOW));
        expect(daily[0].date < daily[daily.length - 1].date).toBe(true);

        for (let i = 0; i < daily.length - 1; i++) {
            const curr = new Date(daily[i].date + "T12:00:00Z");
            const next = new Date(daily[i + 1].date + "T12:00:00Z");
            const diffDays =
                (next.getTime() - curr.getTime()) / (24 * 60 * 60 * 1000);
            expect(diffDays).toBe(1);
        }
    });

    it("for a day in the window that has movements, inflow and outflow equal the independently computed sums", () => {
        const result = getDashboard({ db });
        const { daily } = result.body;
        const dateSet = new Set(daily.map((d) => d.date));
        const priceMap = new Map([...db.products].map((p) => [p.id, p.price]));

        const rawInflow = new Map<string, number>(
            daily.map((d) => [d.date, 0]),
        );
        const rawOutflow = new Map<string, number>(
            daily.map((d) => [d.date, 0]),
        );

        for (const m of db.movements) {
            const localDate = toLocalIsoDate(new Date(m.date));
            if (!dateSet.has(localDate)) continue;
            const price = priceMap.get(m.productId) ?? 0;
            if (m.type === "receipt") {
                rawInflow.set(
                    localDate,
                    (rawInflow.get(localDate) ?? 0) + m.quantity * price,
                );
            } else if (m.type === "shipment" || m.type === "write-off") {
                rawOutflow.set(
                    localDate,
                    (rawOutflow.get(localDate) ?? 0) +
                        Math.abs(m.quantity) * price,
                );
            }
        }

        const targetDay = daily.find(
            (d) =>
                (rawInflow.get(d.date) ?? 0) > 0 ||
                (rawOutflow.get(d.date) ?? 0) > 0,
        );
        expect(targetDay).toBeDefined();
        if (targetDay === undefined) return;

        expect(targetDay.inflow).toBe(
            Math.round(rawInflow.get(targetDay.date) ?? 0),
        );
        expect(targetDay.outflow).toBe(
            Math.round(rawOutflow.get(targetDay.date) ?? 0),
        );
    });

    describe("mutations", () => {
        let mutableStorage = createMemoryStorage();
        let mutableDb = createDb({
            storage: mutableStorage,
            now: () => FIXED_NOW,
        });

        beforeEach(() => {
            mutableStorage = createMemoryStorage();
            mutableDb = createDb({
                storage: mutableStorage,
                now: () => FIXED_NOW,
            });
        });

        it("adding a receipt dated today increases today's inflow by exactly quantity * price and does not change outflow", () => {
            const today = toLocalIsoDate(FIXED_NOW);
            const priceMap = new Map(
                [...mutableDb.products].map((p) => [p.id, p.price]),
            );

            let rawInflowToday = 0;
            let rawOutflowToday = 0;
            for (const m of mutableDb.movements) {
                if (toLocalIsoDate(new Date(m.date)) !== today) continue;
                const price = priceMap.get(m.productId) ?? 0;
                if (m.type === "receipt") {
                    rawInflowToday += m.quantity * price;
                } else if (m.type === "shipment" || m.type === "write-off") {
                    rawOutflowToday += Math.abs(m.quantity) * price;
                }
            }

            const product = mutableDb.products.find((p) => p.unit === "pcs");
            expect(product).toBeDefined();
            if (product === undefined) return;

            const qty = 10;
            const expectedInflow = Math.round(
                rawInflowToday + qty * product.price,
            );
            const expectedOutflow = Math.round(rawOutflowToday);

            mutableDb.transaction((draft) => {
                draft.movements.push({
                    id: "mov-test-receipt-001",
                    type: "receipt",
                    productId: product.id,
                    quantity: qty,
                    date: FIXED_NOW.toISOString(),
                    reference: "TEST-RECEIPT-001",
                    supplierId: "sup-001",
                });
            });

            const result = getDashboard({ db: mutableDb });
            const todayEntry = result.body.daily.find((d) => d.date === today);
            expect(todayEntry).toBeDefined();
            if (todayEntry === undefined) return;

            expect(todayEntry.inflow).toBe(expectedInflow);
            expect(todayEntry.outflow).toBe(expectedOutflow);
        });

        it("adding an adjustment dated today changes neither inflow nor outflow", () => {
            const today = toLocalIsoDate(FIXED_NOW);
            const priceMap = new Map(
                [...mutableDb.products].map((p) => [p.id, p.price]),
            );

            let rawInflowToday = 0;
            let rawOutflowToday = 0;
            for (const m of mutableDb.movements) {
                if (toLocalIsoDate(new Date(m.date)) !== today) continue;
                const price = priceMap.get(m.productId) ?? 0;
                if (m.type === "receipt") {
                    rawInflowToday += m.quantity * price;
                } else if (m.type === "shipment" || m.type === "write-off") {
                    rawOutflowToday += Math.abs(m.quantity) * price;
                }
            }

            const product = mutableDb.products[0];
            expect(product).toBeDefined();
            if (product === undefined) return;

            mutableDb.transaction((draft) => {
                draft.movements.push({
                    id: "mov-test-adj-001",
                    type: "adjustment",
                    productId: product.id,
                    quantity: 5,
                    date: FIXED_NOW.toISOString(),
                    reference: "ADJ-TEST-001",
                    comment: "Test adjustment",
                });
            });

            const result = getDashboard({ db: mutableDb });
            const todayEntry = result.body.daily.find((d) => d.date === today);
            expect(todayEntry).toBeDefined();
            if (todayEntry === undefined) return;

            expect(todayEntry.inflow).toBe(Math.round(rawInflowToday));
            expect(todayEntry.outflow).toBe(Math.round(rawOutflowToday));
        });

        it("a movement dated 30 days before today is not counted in any daily entry", () => {
            const before = getDashboard({ db: mutableDb });

            const product = mutableDb.products.find((p) => p.unit === "pcs");
            expect(product).toBeDefined();
            if (product === undefined) return;

            const outsideDate = new Date(
                FIXED_NOW.getTime() - 30 * 24 * 60 * 60 * 1000,
            );

            mutableDb.transaction((draft) => {
                draft.movements.push({
                    id: "mov-test-outside-001",
                    type: "receipt",
                    productId: product.id,
                    quantity: 999,
                    date: outsideDate.toISOString(),
                    reference: "OUTSIDE-001",
                    supplierId: "sup-001",
                });
            });

            const after = getDashboard({ db: mutableDb });

            expect(after.body.daily).toEqual(before.body.daily);
        });

        it("a movement whose product does not exist is skipped without throwing", () => {
            const before = getDashboard({ db: mutableDb });

            mutableDb.transaction((draft) => {
                draft.movements.push({
                    id: "mov-test-orphan-001",
                    type: "receipt",
                    productId: "prd-does-not-exist",
                    quantity: 999,
                    date: FIXED_NOW.toISOString(),
                    reference: "ORPHAN-001",
                    supplierId: "sup-001",
                });
            });

            expect(() => getDashboard({ db: mutableDb })).not.toThrow();

            const after = getDashboard({ db: mutableDb });
            expect(after.body.daily).toEqual(before.body.daily);
        });

        it("runningLow: 2 out and 4 low with distinct ratios gives exact id order, lowStockCount 4, outOfStockCount 2", () => {
            const p0 = mutableDb.products[0];
            const p1 = mutableDb.products[1];
            const p2 = mutableDb.products[2];
            const p3 = mutableDb.products[3];
            const p4 = mutableDb.products[4];
            const p5 = mutableDb.products[5];

            mutableDb.transaction((draft) => {
                for (const p of draft.products) {
                    p.quantity = p.minQuantity + 1;
                }
                // 2 out products (quantity 0)
                draft.products[0].quantity = 0;
                draft.products[1].quantity = 0;
                // 4 low products with distinct ratios
                draft.products[2].minQuantity = 100;
                draft.products[2].quantity = 80; // ratio 0.8
                draft.products[3].minQuantity = 100;
                draft.products[3].quantity = 20; // ratio 0.2
                draft.products[4].minQuantity = 100;
                draft.products[4].quantity = 50; // ratio 0.5
                draft.products[5].minQuantity = 100;
                draft.products[5].quantity = 35; // ratio 0.35
            });

            // Expected order: out products by name, then low by ratio asc, sliced to 5
            const sortedOut = [p0, p1].sort((a, b) =>
                a.name.localeCompare(b.name),
            );
            const sortedLow = [
                { id: p2.id, name: p2.name, ratio: 0.8 },
                { id: p3.id, name: p3.name, ratio: 0.2 },
                { id: p4.id, name: p4.name, ratio: 0.5 },
                { id: p5.id, name: p5.name, ratio: 0.35 },
            ].sort((a, b) => a.ratio - b.ratio || a.name.localeCompare(b.name));

            const expectedIds = [
                ...sortedOut.map((p) => p.id),
                ...sortedLow.map((x) => x.id),
            ].slice(0, 5);

            const result = getDashboard({ db: mutableDb });

            expect(result.body.runningLow.map((p) => p.id)).toEqual(
                expectedIds,
            );
            expect(result.body.lowStockCount).toBe(4);
            expect(result.body.outOfStockCount).toBe(2);
        });

        it("a receipt at local midnight of the oldest window day is counted in daily[0].inflow", () => {
            const { daily } = getDashboard({ db: mutableDb }).body;
            const oldestDate = daily[0].date;
            const [y, m, d] = oldestDate.split("-").map(Number);
            const midnightLocal = new Date(y, m - 1, d);

            const priceMap = new Map(
                [...mutableDb.products].map((p) => [p.id, p.price]),
            );

            let rawInflowOldest = 0;
            for (const mov of mutableDb.movements) {
                if (toLocalIsoDate(new Date(mov.date)) !== oldestDate) continue;
                const price = priceMap.get(mov.productId) ?? 0;
                if (mov.type === "receipt") {
                    rawInflowOldest += mov.quantity * price;
                }
            }

            const product = mutableDb.products.find((p) => p.unit === "pcs");
            expect(product).toBeDefined();
            if (product === undefined) return;

            const qty = 5;
            const expectedInflow = Math.round(
                rawInflowOldest + qty * product.price,
            );

            mutableDb.transaction((draft) => {
                draft.movements.push({
                    id: "mov-test-boundary-001",
                    type: "receipt",
                    productId: product.id,
                    quantity: qty,
                    date: midnightLocal.toISOString(),
                    reference: "BOUNDARY-001",
                    supplierId: "sup-001",
                });
            });

            const result = getDashboard({ db: mutableDb });
            expect(result.body.daily[0].inflow).toBe(expectedInflow);
        });
    });
});
