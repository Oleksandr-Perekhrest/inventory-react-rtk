// outsource dependencies
import { it, expect, describe } from "vitest";

// local dependencies
import { ProductSchema } from "./product";

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
