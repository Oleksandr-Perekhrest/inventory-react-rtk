// outsource dependencies
import { it, expect, describe } from "vitest";

// local dependencies
import type { Product } from "@/domain";
import { formatPrice, stockStatus, formatQuantity } from "./helpers";

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

describe("formatPrice", () => {
    it("2850 kopecks → '₴28.50'", () => {
        expect(formatPrice(2850)).toBe("₴28.50");
    });

    it("0 kopecks → '₴0.00'", () => {
        expect(formatPrice(0)).toBe("₴0.00");
    });

    it("100000 kopecks → '₴1,000.00'", () => {
        expect(formatPrice(100000)).toBe("₴1,000.00");
    });
});

describe("formatQuantity", () => {
    it("integer quantity with pcs unit", () => {
        expect(formatQuantity(5, "pcs")).toBe("5 pcs");
    });

    it("displays up to 3 fraction digits", () => {
        expect(formatQuantity(1.234, "kg")).toBe("1.234 kg");
    });

    it("rounds a 4th decimal digit", () => {
        expect(formatQuantity(1.23456, "kg")).toBe("1.235 kg");
    });

    it("'l' unit label is 'L'", () => {
        expect(formatQuantity(2, "l")).toBe("2 L");
    });

    it("'box' unit label is 'box'", () => {
        expect(formatQuantity(10, "box")).toBe("10 box");
    });
});
