// outsource dependencies
import { it, expect, describe } from "vitest";
import { createEntityAdapter } from "@reduxjs/toolkit";

// local dependencies
import type { CategoryWithCounts } from "@/api/types";
import {
    ROOT,
    findMatches,
    splitByMatch,
    getVisibleOrder,
    collectAncestors,
    buildChildrenIndex,
} from "./tree";

// Fixture — 7 categories, 3 levels, siblings inserted out of position order:
//   ROOT children by id: [cat-1, cat-2, cat-7]; by position: [cat-2(10), cat-1(20), cat-7(30)]
//   cat-2 children by id: [cat-3, cat-4];       by position: [cat-4(2),  cat-3(5)]
//   cat-4 children by id: [cat-5, cat-6];        by position: [cat-6(0),  cat-5(1)]
// Two names starting with 'F' (Figs, Fruit) for type-ahead coverage.
const adapter = createEntityAdapter<CategoryWithCounts, string>({
    selectId: (c) => c.id,
});

const fixtureState = adapter.setAll(adapter.getInitialState(), [
    {
        id: "cat-1",
        name: "Beverages",
        parentId: null,
        position: 20,
        productCount: 0,
        totalProductCount: 0,
    },
    {
        id: "cat-2",
        name: "Food",
        parentId: null,
        position: 10,
        productCount: 0,
        totalProductCount: 0,
    },
    {
        id: "cat-3",
        name: "Dairy",
        parentId: "cat-2",
        position: 5,
        productCount: 0,
        totalProductCount: 0,
    },
    {
        id: "cat-4",
        name: "Frozen",
        parentId: "cat-2",
        position: 2,
        productCount: 0,
        totalProductCount: 0,
    },
    {
        id: "cat-5",
        name: "Figs",
        parentId: "cat-4",
        position: 1,
        productCount: 0,
        totalProductCount: 0,
    },
    {
        id: "cat-6",
        name: "Fruit",
        parentId: "cat-4",
        position: 0,
        productCount: 0,
        totalProductCount: 0,
    },
    {
        id: "cat-7",
        name: "Chemicals",
        parentId: null,
        position: 30,
        productCount: 0,
        totalProductCount: 0,
    },
]);

describe("buildChildrenIndex", () => {
    const index = buildChildrenIndex(fixtureState);

    it("places root-level categories under ROOT in position order", () => {
        // insertion order would give [cat-1, cat-2, cat-7]; position order differs
        expect(index.get(ROOT)).toEqual(["cat-2", "cat-1", "cat-7"]);
    });

    it("sorts Food's children by position, not by insertion order", () => {
        // insertion order: [cat-3, cat-4]; position 2 vs 5 → [cat-4, cat-3]
        expect(index.get("cat-2")).toEqual(["cat-4", "cat-3"]);
    });

    it("sorts Frozen's children by position, not by insertion order", () => {
        // insertion order: [cat-5, cat-6]; position 1 vs 0 → [cat-6, cat-5]
        expect(index.get("cat-4")).toEqual(["cat-6", "cat-5"]);
    });

    it("does not add leaf nodes as parent keys", () => {
        expect(index.has("cat-1")).toBe(false);
        expect(index.has("cat-6")).toBe(false);
    });
});

describe("findMatches", () => {
    it("matches case-insensitively", () => {
        expect(findMatches(fixtureState, "FOOD")).toEqual(new Set(["cat-2"]));
    });

    it("trims surrounding whitespace before matching", () => {
        expect(findMatches(fixtureState, "  food  ")).toEqual(
            new Set(["cat-2"]),
        );
    });

    it("returns empty set for empty string", () => {
        expect(findMatches(fixtureState, "")).toEqual(new Set());
    });

    it("returns empty set for whitespace-only query", () => {
        expect(findMatches(fixtureState, "   ")).toEqual(new Set());
    });

    it("returns all ids whose names contain the query", () => {
        // 'o' appears in Food (cat-2) and Frozen (cat-4), nowhere else
        expect(findMatches(fixtureState, "o")).toEqual(
            new Set(["cat-2", "cat-4"]),
        );
    });
});

describe("collectAncestors", () => {
    it("returns all ancestors of a deep node", () => {
        // Figs (cat-5) → Frozen (cat-4) → Food (cat-2) → ROOT (not included)
        expect(collectAncestors(fixtureState, new Set(["cat-5"]))).toEqual(
            new Set(["cat-4", "cat-2"]),
        );
    });

    it("does not include the starting node itself", () => {
        const result = collectAncestors(fixtureState, new Set(["cat-5"]));
        expect(result.has("cat-5")).toBe(false);
    });

    it("terminates when the ancestor chain contains a cycle", () => {
        const cycleState = adapter.setAll(adapter.getInitialState(), [
            {
                id: "cycle-a",
                name: "A",
                parentId: "cycle-b",
                position: 0,
                productCount: 0,
                totalProductCount: 0,
            },
            {
                id: "cycle-b",
                name: "B",
                parentId: "cycle-a",
                position: 1,
                productCount: 0,
                totalProductCount: 0,
            },
        ]);
        expect(() =>
            collectAncestors(cycleState, new Set(["cycle-b"])),
        ).not.toThrow();
        expect(
            collectAncestors(cycleState, new Set(["cycle-b"])),
        ).toBeInstanceOf(Set);
    });
});

describe("splitByMatch", () => {
    it("splits into prefix, matched span, and suffix", () => {
        expect(splitByMatch("Fruit", "ui")).toEqual([
            { text: "Fr", match: false },
            { text: "ui", match: true },
            { text: "t", match: false },
        ]);
    });

    it("produces a segment for every occurrence when query appears multiple times", () => {
        expect(splitByMatch("abcabc", "bc")).toEqual([
            { text: "a", match: false },
            { text: "bc", match: true },
            { text: "a", match: false },
            { text: "bc", match: true },
        ]);
    });

    it("preserves the original casing of the source text in output segments", () => {
        // query is uppercase but the matched segment keeps the source case
        expect(splitByMatch("Beverages", "BEVER")).toEqual([
            { text: "Bever", match: true },
            { text: "ages", match: false },
        ]);
    });

    it("returns a single non-matching segment for empty query", () => {
        expect(splitByMatch("Food", "")).toEqual([
            { text: "Food", match: false },
        ]);
    });

    it("returns a single non-matching segment when query is not found", () => {
        expect(splitByMatch("Fruit", "xyz")).toEqual([
            { text: "Fruit", match: false },
        ]);
    });
});

describe("getVisibleOrder", () => {
    const index = buildChildrenIndex(fixtureState);

    it("shows only root-level nodes when all are collapsed", () => {
        const result = getVisibleOrder(index, () => false);
        expect(result).toEqual([
            {
                id: "cat-2",
                parentId: ROOT,
                level: 1,
                hasChildren: true,
                expanded: false,
            },
            {
                id: "cat-1",
                parentId: ROOT,
                level: 1,
                hasChildren: false,
                expanded: false,
            },
            {
                id: "cat-7",
                parentId: ROOT,
                level: 1,
                hasChildren: false,
                expanded: false,
            },
        ]);
    });

    it("inserts children right after the expanded node at level + 1", () => {
        // Food (cat-2) is at level 1; expanding it shows cat-4 and cat-3 at level 2
        const result = getVisibleOrder(index, (id) => id === "cat-2");
        expect(result).toEqual([
            {
                id: "cat-2",
                parentId: ROOT,
                level: 1,
                hasChildren: true,
                expanded: true,
            },
            {
                id: "cat-4",
                parentId: "cat-2",
                level: 2,
                hasChildren: true,
                expanded: false,
            },
            {
                id: "cat-3",
                parentId: "cat-2",
                level: 2,
                hasChildren: false,
                expanded: false,
            },
            {
                id: "cat-1",
                parentId: ROOT,
                level: 1,
                hasChildren: false,
                expanded: false,
            },
            {
                id: "cat-7",
                parentId: ROOT,
                level: 1,
                hasChildren: false,
                expanded: false,
            },
        ]);
    });

    it("with a visible set only visible ids appear and expanded reflects visible children", () => {
        // visible: Food (cat-2), Frozen (cat-4), Fruit (cat-6)
        // Figs (cat-5) and Dairy (cat-3) are excluded
        const visible = new Set(["cat-2", "cat-4", "cat-6"]);
        const result = getVisibleOrder(index, () => false, visible);
        expect(result).toEqual([
            {
                id: "cat-2",
                parentId: ROOT,
                level: 1,
                hasChildren: true,
                expanded: true,
            },
            {
                id: "cat-4",
                parentId: "cat-2",
                level: 2,
                hasChildren: true,
                expanded: true,
            },
            {
                id: "cat-6",
                parentId: "cat-4",
                level: 3,
                hasChildren: false,
                expanded: false,
            },
        ]);
    });
});
