// outsource dependencies
import { it, expect, describe } from "vitest";

// local dependencies
import type { Product } from "./product";
import { stockStatus, ProductSchema } from "./product";

function makeProduct(overrides: Partial<Product>): Product {
    return {
        id: "prod-1",
        sku: "SKU-001",
        name: "Test Product",
        categoryId: "cat-1",
        unit: "pcs",
        price: 100,
        quantity: 10,
        minQuantity: 5,
        perishable: false,
        ...overrides,
    };
}

describe("stockStatus", () => {
    it("quantity 0 → 'out'", () => {
        expect(stockStatus(makeProduct({ quantity: 0, minQuantity: 10 }))).toBe(
            "out",
        );
    });

    it("quantity 0 with minQuantity 0 → 'out'", () => {
        expect(stockStatus(makeProduct({ quantity: 0, minQuantity: 0 }))).toBe(
            "out",
        );
    });

    it("quantity below minQuantity → 'low'", () => {
        expect(stockStatus(makeProduct({ quantity: 3, minQuantity: 10 }))).toBe(
            "low",
        );
    });

    it("quantity equal to minQuantity → 'ok'", () => {
        expect(
            stockStatus(makeProduct({ quantity: 10, minQuantity: 10 })),
        ).toBe("ok");
    });

    it("quantity above minQuantity → 'ok'", () => {
        expect(
            stockStatus(makeProduct({ quantity: 15, minQuantity: 10 })),
        ).toBe("ok");
    });

    it("fractional kg: 0.5 below minQuantity 1 → 'low'", () => {
        expect(
            stockStatus(
                makeProduct({ quantity: 0.5, minQuantity: 1, unit: "kg" }),
            ),
        ).toBe("low");
    });
});

const base = {
    id: "prod-001",
    sku: "CHEDDAR-001",
    name: "Cheddar",
    categoryId: "cat-dairy",
    unit: "kg" as const,
    price: 1500,
    quantity: 10,
    minQuantity: 2,
    perishable: false,
};

describe("ProductSchema", () => {
    it("accepts a valid product", () => {
        expect(ProductSchema.safeParse(base).success).toBe(true);
    });

    it("accepts fractional quantity 2.5 for unit kg", () => {
        const result = ProductSchema.safeParse({ ...base, quantity: 2.5 });
        expect(result.success).toBe(true);
    });

    it("rejects fractional quantity 2.5 for unit pcs", () => {
        const result = ProductSchema.safeParse({
            ...base,
            unit: "pcs",
            quantity: 2.5,
        });
        expect(result.success).toBe(false);
        if (!result.success) {
            expect(
                result.error.issues.some((i) => i.path[0] === "quantity"),
            ).toBe(true);
        }
    });

    it("rejects fractional minQuantity 2.5 for unit box", () => {
        const result = ProductSchema.safeParse({
            ...base,
            unit: "box",
            minQuantity: 2.5,
        });
        expect(result.success).toBe(false);
        if (!result.success) {
            expect(
                result.error.issues.some((i) => i.path[0] === "minQuantity"),
            ).toBe(true);
        }
    });

    it("rejects non-integer price 12.5", () => {
        const result = ProductSchema.safeParse({ ...base, price: 12.5 });
        expect(result.success).toBe(false);
        if (!result.success) {
            expect(result.error.issues.some((i) => i.path[0] === "price")).toBe(
                true,
            );
        }
    });

    it("rejects sku containing lowercase letters", () => {
        const result = ProductSchema.safeParse({ ...base, sku: "cheddar-001" });
        expect(result.success).toBe(false);
        if (!result.success) {
            expect(result.error.issues.some((i) => i.path[0] === "sku")).toBe(
                true,
            );
        }
    });

    it("rejects name that is only whitespace", () => {
        const result = ProductSchema.safeParse({ ...base, name: "   " });
        expect(result.success).toBe(false);
        if (!result.success) {
            expect(result.error.issues.some((i) => i.path[0] === "name")).toBe(
                true,
            );
        }
    });
});
