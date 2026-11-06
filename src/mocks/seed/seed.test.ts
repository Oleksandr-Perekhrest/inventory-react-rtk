// outsource dependencies
import { it, expect, describe } from "vitest";

// local dependencies
import { createSeed } from ".";
import {
    ProductSchema,
    CategorySchema,
    MovementSchema,
    SupplierSchema,
} from "../../domain";

const FIXED_NOW = new Date("2026-11-06T07:00:00Z");

const TEST_DATES = [
    new Date("2026-11-06T07:00:00Z"), // early morning, before work hours
    new Date("2026-11-06T08:00:00Z"), // exactly at work-hour start
    new Date("2026-11-06T08:30:00Z"), // just after work-hour start
    new Date("2026-11-06T09:30:00Z"), // mid-morning
    new Date("2026-11-06T12:00:00Z"), // noon
    new Date("2026-11-06T16:30:00Z"), // late afternoon, within work hours
    new Date("2026-11-06T17:30:00Z"), // after work hours
    new Date("2026-11-06T23:00:00Z"), // late evening
    new Date("2026-11-07T00:30:00Z"), // just past midnight
    new Date("2026-10-15T14:00:00Z"), // different month
    new Date("2026-01-01T12:00:00Z"), // new year
];

const DAY_MS = 86_400_000;

function checkInvariants(now: Date): void {
    const { categories, products, suppliers, movements } = createSeed(now);

    // --- Schema validation ---
    for (const c of categories) {
        expect(
            CategorySchema.safeParse(c).success,
            `category ${c.id} schema`,
        ).toBe(true);
    }
    for (const p of products) {
        expect(
            ProductSchema.safeParse(p).success,
            `product ${p.id} schema`,
        ).toBe(true);
    }
    for (const s of suppliers) {
        expect(
            SupplierSchema.safeParse(s).success,
            `supplier ${s.id} schema`,
        ).toBe(true);
    }
    for (const m of movements) {
        expect(
            MovementSchema.safeParse(m).success,
            `movement ${m.id} schema`,
        ).toBe(true);
    }

    // --- Referential integrity ---
    const categoryIds = new Set(categories.map((c) => c.id));
    const productIds = new Set(products.map((p) => p.id));
    const supplierIds = new Set(suppliers.map((s) => s.id));

    for (const p of products) {
        expect(
            categoryIds.has(p.categoryId),
            `product ${p.id} categoryId missing`,
        ).toBe(true);
    }
    for (const c of categories) {
        if (c.parentId !== null) {
            expect(
                categoryIds.has(c.parentId),
                `category ${c.id} parentId missing`,
            ).toBe(true);
        }
    }
    for (const m of movements) {
        expect(
            productIds.has(m.productId),
            `movement ${m.id} productId missing`,
        ).toBe(true);
        if (m.supplierId !== undefined) {
            expect(
                supplierIds.has(m.supplierId),
                `movement ${m.id} supplierId missing`,
            ).toBe(true);
        }
    }

    // --- Uniqueness ---
    expect(
        new Set(movements.map((m) => m.id)).size,
        "movement ids not unique",
    ).toBe(movements.length);
    expect(
        new Set(products.map((p) => p.sku)).size,
        "product skus not unique",
    ).toBe(products.length);
    expect(categoryIds.size, "category ids not unique").toBe(categories.length);

    // --- Movements array is globally sorted by date ---
    for (let i = 1; i < movements.length; i++) {
        expect(
            movements[i].date >= movements[i - 1].date,
            `movements not sorted at index ${i}`,
        ).toBe(true);
    }

    // --- Category tree: no cycles ---
    const catById = new Map(categories.map((c) => [c.id, c]));
    for (const cat of categories) {
        const visited = new Set<string>();
        let id: string | null = cat.id;
        while (id !== null) {
            expect(visited.has(id), `cycle at category ${id}`).toBe(false);
            visited.add(id);
            const c = catById.get(id);
            if (!c) break;
            id = c.parentId;
        }
    }

    // --- Sibling positions are 0..n-1 without gaps ---
    const siblingPositions = new Map<string | null, number[]>();
    for (const cat of categories) {
        const arr = siblingPositions.get(cat.parentId) ?? [];
        arr.push(cat.position);
        siblingPositions.set(cat.parentId, arr);
    }
    for (const [parentId, positions] of siblingPositions) {
        const sorted = [...positions].sort((a, b) => a - b);
        for (let i = 0; i < sorted.length; i++) {
            expect(
                sorted[i],
                `position gap under parent ${String(parentId)}`,
            ).toBe(i);
        }
    }

    // --- Per-product: running sum never < 0, final sum === product.quantity ---
    const productById = new Map(products.map((p) => [p.id, p]));
    for (const product of products) {
        const movs = movements.filter((m) => m.productId === product.id);
        let running = 0;
        for (const m of movs) {
            running += m.quantity;
            expect(
                running,
                `${product.id} running sum below 0`,
            ).toBeGreaterThanOrEqual(0);
        }
        expect(running, `${product.id} final sum mismatch`).toBe(
            product.quantity,
        );
    }

    // --- Per-product: dates strictly increasing ---
    for (const product of products) {
        const movs = movements.filter((m) => m.productId === product.id);
        for (let i = 1; i < movs.length; i++) {
            expect(
                movs[i].date > movs[i - 1].date,
                `${product.id} dates not strictly increasing at index ${i}`,
            ).toBe(true);
        }
    }

    // --- Every movement within working hours 08:00–16:59 UTC ---
    for (const m of movements) {
        const d = new Date(m.date);
        const dayStart = Date.UTC(
            d.getUTCFullYear(),
            d.getUTCMonth(),
            d.getUTCDate(),
        );
        const timeMs = d.getTime() - dayStart;
        expect(timeMs, `${m.id} before 08:00`).toBeGreaterThanOrEqual(
            8 * 3_600_000,
        );
        expect(timeMs, `${m.id} at or after 17:00`).toBeLessThan(
            17 * 3_600_000,
        );
    }

    // --- Date range: after now - 91 days and not later than now - 1 hour ---
    const startBound = now.getTime() - 91 * DAY_MS;
    const endBound = now.getTime() - 3_600_000;
    for (const m of movements) {
        const ts = new Date(m.date).getTime();
        expect(ts, `${m.id} before now-91d`).toBeGreaterThan(startBound);
        expect(ts, `${m.id} after now-1h`).toBeLessThanOrEqual(endBound);
    }

    // --- IDs are mov-00001.. in global date order ---
    for (let i = 0; i < movements.length; i++) {
        expect(movements[i].id).toBe(`mov-${String(i + 1).padStart(5, "0")}`);
    }

    // --- SO/WO/ADJ document numbers are 1..n in date order without gaps ---
    const shipments = movements.filter((m) => m.type === "shipment");
    for (let i = 0; i < shipments.length; i++) {
        expect(shipments[i].reference).toBe(
            `SO-${String(i + 1).padStart(5, "0")}`,
        );
    }
    const writeOffs = movements.filter((m) => m.type === "write-off");
    for (let i = 0; i < writeOffs.length; i++) {
        expect(writeOffs[i].reference).toBe(
            `WO-${String(i + 1).padStart(5, "0")}`,
        );
    }
    const adjustments = movements.filter((m) => m.type === "adjustment");
    for (let i = 0; i < adjustments.length; i++) {
        expect(adjustments[i].reference).toBe(
            `ADJ-${String(i + 1).padStart(5, "0")}`,
        );
    }

    // --- Every receipt has a supplierId ---
    for (const m of movements.filter((m) => m.type === "receipt")) {
        expect(
            m.supplierId,
            `receipt ${m.id} missing supplierId`,
        ).toBeDefined();
    }

    // --- Receipt lines with the same reference share supplier and calendar day ---
    const receiptsByRef = new Map<string, typeof movements>();
    for (const m of movements.filter((m) => m.type === "receipt")) {
        const arr = receiptsByRef.get(m.reference) ?? [];
        arr.push(m);
        receiptsByRef.set(m.reference, arr);
    }
    for (const [ref, group] of receiptsByRef) {
        const supplierId = group[0].supplierId;
        const day = group[0].date.slice(0, 10);
        for (const m of group) {
            expect(m.supplierId, `ref ${ref} supplier mismatch`).toBe(
                supplierId,
            );
            expect(m.date.slice(0, 10), `ref ${ref} date mismatch`).toBe(day);
        }
    }

    // --- Perishable receipts have batch and expiresAt after receipt date ---
    // --- Non-perishable receipts have neither ---
    for (const m of movements.filter((m) => m.type === "receipt")) {
        const product = productById.get(m.productId)!;
        if (product.perishable) {
            expect(m.batch, `${m.id} missing batch`).toBeDefined();
            expect(m.expiresAt, `${m.id} missing expiresAt`).toBeDefined();
            expect(
                m.expiresAt! > m.date.slice(0, 10),
                `${m.id} expiresAt not after receipt date`,
            ).toBe(true);
        } else {
            expect(m.batch, `${m.id} unexpected batch`).toBeUndefined();
            expect(m.expiresAt, `${m.id} unexpected expiresAt`).toBeUndefined();
        }
    }
}

describe("createSeed", () => {
    describe("invariants", () => {
        for (const now of TEST_DATES) {
            it(`satisfies all invariants for now = ${now.toISOString()}`, () => {
                checkInvariants(now);
            });
        }
    });

    it("is deterministic: two calls with the same now produce deep-equal output", () => {
        const a = createSeed(FIXED_NOW);
        const b = createSeed(FIXED_NOW);
        expect(a).toEqual(b);
    });

    it("produces different movement dates for a different now (control)", () => {
        const a = createSeed(FIXED_NOW);
        const b = createSeed(new Date("2026-10-01T12:00:00Z"));
        expect(a.movements.map((m) => m.date)).not.toEqual(
            b.movements.map((m) => m.date),
        );
    });

    it("is isolated: mutating the result does not affect the next call", () => {
        const a = createSeed(FIXED_NOW);
        const originalQty = a.products[0].quantity;
        const originalName = a.categories[0].name;
        a.products[0].quantity = 999_999;
        a.categories[0].name = "MUTATED";
        const b = createSeed(FIXED_NOW);
        expect(b.products[0].quantity, "product quantity was mutated").toBe(
            originalQty,
        );
        expect(b.categories[0].name, "category name was mutated").toBe(
            originalName,
        );
    });
});
