// outsource dependencies
import { it, expect, describe } from "vitest";

// local dependencies
import { computeTotalProductCounts } from "./categoryCounts";

const R = { id: "R", parentId: null, productCount: 1 };
const C = { id: "C", parentId: "R", productCount: 2 };
const G = { id: "G", parentId: "C", productCount: 4 };
const S = { id: "S", parentId: null, productCount: 3 };
const ALL = [R, C, G, S];

describe("computeTotalProductCounts", () => {
    it("computes subtree sums: R=7, C=6, G=4, S=3", () => {
        const totals = computeTotalProductCounts(ALL);
        expect(totals.get("R")).toBe(7);
        expect(totals.get("C")).toBe(6);
        expect(totals.get("G")).toBe(4);
        expect(totals.get("S")).toBe(3);
    });

    it("leaf total equals own productCount", () => {
        const totals = computeTotalProductCounts(ALL);
        expect(totals.get("G")).toBe(G.productCount);
        expect(totals.get("S")).toBe(S.productCount);
    });

    it("orphan is treated as root and does not add to any other category", () => {
        const orphan = { id: "O", parentId: "missing-parent", productCount: 5 };
        const totals = computeTotalProductCounts([R, orphan]);
        expect(totals.get("O")).toBe(5);
        expect(totals.get("R")).toBe(1);
    });

    it("empty input returns empty Map", () => {
        const totals = computeTotalProductCounts([]);
        expect(totals.size).toBe(0);
    });

    it("does not mutate input", () => {
        const input = structuredClone(ALL);
        computeTotalProductCounts(input);
        expect(input).toEqual(ALL);
    });
});
