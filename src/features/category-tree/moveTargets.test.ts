// outsource dependencies
import { it, expect, describe } from "vitest";

// local dependencies
import type { CategoryWithCounts } from "@/api/types";
import { categoriesAdapter } from "@/api/endpoints/categories";
import { categoryMoveToEnd } from "@/features/catalog/moveCommands";
import {
    buildMoveTargets,
    filterMoveTargets,
} from "@/features/category-tree/moveTargets";

function cat(
    id: string,
    parentId: string | null,
    position: number,
): CategoryWithCounts {
    return {
        id,
        name: id,
        parentId,
        position,
        productCount: 0,
        totalProductCount: 0,
    };
}

// Literal fixture: roots A(0), B(1); A has A1(0), A2(1); A1 has A1a(0).
const DATA = categoriesAdapter.setAll(categoriesAdapter.getInitialState(), [
    cat("A", null, 0),
    cat("B", null, 1),
    cat("A1", "A", 0),
    cat("A2", "A", 1),
    cat("A1a", "A1", 0),
]);

describe("buildMoveTargets — product mode", () => {
    it("1 — depth-first order [A,A1,A1a,A2,B] with depths [1,2,3,2,1]; only A1 disabled/current; no Top level", () => {
        const targets = buildMoveTargets(DATA, {
            kind: "product",
            categoryId: "A1",
        });

        expect(targets.map((t) => t.id)).toEqual(["A", "A1", "A1a", "A2", "B"]);
        expect(targets.map((t) => t.depth)).toEqual([1, 2, 3, 2, 1]);

        for (const t of targets) {
            const isCurrentCategory = t.id === "A1";
            expect(t.disabled, `disabled for ${t.id}`).toBe(isCurrentCategory);
            expect(t.current, `current for ${t.id}`).toBe(isCurrentCategory);
        }

        expect(targets.some((t) => t.id === null)).toBe(false);
    });
});

describe("buildMoveTargets — category mode", () => {
    it("2 — A1: Top level first and enabled; A and A1+A1a disabled; A is current; A2 and B enabled", () => {
        const targets = buildMoveTargets(DATA, {
            kind: "category",
            categoryId: "A1",
        });

        // "Top level" is the first option, enabled (A1's parent is "A", not null)
        expect(targets[0]).toEqual({
            id: null,
            name: "Top level",
            depth: 0,
            disabled: false,
            current: false,
        });

        // A is A1's current parent → disabled and current
        const a = targets.find((t) => t.id === "A");
        expect(a?.disabled).toBe(true);
        expect(a?.current).toBe(true);

        // A1 itself and A1a (descendant) → disabled (can't move into self or descendant)
        expect(targets.find((t) => t.id === "A1")?.disabled).toBe(true);
        expect(targets.find((t) => t.id === "A1a")?.disabled).toBe(true);

        // A2 and B are valid targets → enabled, not current
        const a2 = targets.find((t) => t.id === "A2");
        expect(a2?.disabled).toBe(false);
        expect(a2?.current).toBe(false);

        const b = targets.find((t) => t.id === "B");
        expect(b?.disabled).toBe(false);
        expect(b?.current).toBe(false);
    });

    it("3 — root B: Top level is current and disabled", () => {
        const targets = buildMoveTargets(DATA, {
            kind: "category",
            categoryId: "B",
        });

        const topLevel = targets[0];
        expect(topLevel?.id).toBeNull();
        expect(topLevel?.disabled).toBe(true);
        expect(topLevel?.current).toBe(true);
    });
});

describe("filterMoveTargets", () => {
    const opts = [
        { id: "1", name: "Alpha", depth: 1, disabled: false, current: false },
        { id: "2", name: "Beta", depth: 1, disabled: false, current: false },
        { id: "3", name: "Gamma", depth: 1, disabled: false, current: false },
    ];

    it("4 — empty and whitespace-only return all; case-insensitive match; trims surrounding spaces", () => {
        expect(filterMoveTargets(opts, "")).toEqual(opts);
        expect(filterMoveTargets(opts, "   ")).toEqual(opts);

        expect(filterMoveTargets(opts, "al")).toEqual([opts[0]]);
        expect(filterMoveTargets(opts, "AL")).toEqual([opts[0]]);
        expect(filterMoveTargets(opts, "  AL  ")).toEqual([opts[0]]);

        expect(filterMoveTargets(opts, "xyz")).toEqual([]);
    });
});

describe("categoryMoveToEnd", () => {
    it("5 — A2→B: index 0; A2→A (own parent): index 1; A1a→null (top level): index 2", () => {
        // A2 moved to B: B has no current children, so index = 0
        expect(categoryMoveToEnd(DATA, "A2", "B")).toEqual({
            id: "A2",
            parentId: "B",
            index: 0,
        });

        // A2 moved to A (own parent): siblings without A2 = [A1], so index = 1
        expect(categoryMoveToEnd(DATA, "A2", "A")).toEqual({
            id: "A2",
            parentId: "A",
            index: 1,
        });

        // A1a moved to null (top level): siblings without A1a = [A, B], so index = 2
        expect(categoryMoveToEnd(DATA, "A1a", null)).toEqual({
            id: "A1a",
            parentId: null,
            index: 2,
        });
    });
});
