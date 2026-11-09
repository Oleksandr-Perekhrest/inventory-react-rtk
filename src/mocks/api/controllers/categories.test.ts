// outsource dependencies
import { it, expect, describe } from "vitest";

// local dependencies
import { createDb } from "../../db";
import { listCategories } from "./categories";
import { createMemoryStorage } from "../../db/storage";

const FIXED_NOW = new Date("2026-11-06T07:00:00Z");
const db = createDb({ storage: createMemoryStorage(), now: () => FIXED_NOW });

describe("listCategories", () => {
    it("cat-frozen has productCount 0 and totalProductCount 0", () => {
        const rows = listCategories({ db }).body;
        const frozen = rows.find((r) => r.id === "cat-frozen")!;
        expect(frozen).toBeDefined();
        expect(frozen.productCount).toBe(0);
        expect(frozen.totalProductCount).toBe(0);
    });

    it("for a leaf category totalProductCount equals productCount", () => {
        const rows = listCategories({ db }).body;
        const childIds = new Set(
            rows.filter((r) => r.parentId !== null).map((r) => r.parentId!),
        );
        const leaves = rows.filter((r) => !childIds.has(r.id));
        expect(leaves.length).toBeGreaterThan(0);
        for (const leaf of leaves) {
            expect(leaf.totalProductCount).toBe(leaf.productCount);
        }
    });

    it("for every category totalProductCount equals productCount plus the sum of its children's totalProductCount", () => {
        const rows = listCategories({ db }).body;
        const rowMap = new Map(rows.map((r) => [r.id, r]));
        const childrenOf = new Map<string, string[]>();
        for (const r of rows) {
            if (r.parentId !== null) {
                if (!childrenOf.has(r.parentId)) childrenOf.set(r.parentId, []);
                childrenOf.get(r.parentId)!.push(r.id);
            }
        }
        for (const row of rows) {
            const children = childrenOf.get(row.id) ?? [];
            const childTotal = children.reduce(
                (sum, cid) => sum + (rowMap.get(cid)?.totalProductCount ?? 0),
                0,
            );
            expect(row.totalProductCount).toBe(row.productCount + childTotal);
        }
    });

    it("the sum of root totalProductCounts equals the total number of products", () => {
        const rows = listCategories({ db }).body;
        const roots = rows.filter((r) => r.parentId === null);
        const rootTotal = roots.reduce(
            (sum, r) => sum + r.totalProductCount,
            0,
        );
        expect(rootTotal).toBe(db.products.length);
    });
});
