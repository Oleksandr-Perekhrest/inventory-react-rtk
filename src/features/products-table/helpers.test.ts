// outsource dependencies
import { it, expect, describe } from "vitest";

// local dependencies
import { formatPrice, formatQuantity } from "./helpers";

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
