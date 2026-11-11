// outsource dependencies
import { it, expect, describe } from "vitest";

// local dependencies
import { moveCategory, type CategoryPlacement } from "./category-move";

const CATEGORIES: CategoryPlacement[] = [
    { id: "A", parentId: null, position: 0 },
    { id: "B", parentId: null, position: 1 },
    { id: "C", parentId: null, position: 2 },
    { id: "A1", parentId: "A", position: 0 },
    { id: "A2", parentId: "A", position: 1 },
    { id: "A3", parentId: "A", position: 2 },
    { id: "A1a", parentId: "A1", position: 0 },
];

function applyChanges(
    categories: CategoryPlacement[],
    changes: CategoryPlacement[],
): CategoryPlacement[] {
    return categories.map((cat) => {
        const change = changes.find((c) => c.id === cat.id);
        return change === undefined ? { ...cat } : { ...cat, ...change };
    });
}

function childrenOf(
    categories: CategoryPlacement[],
    parentId: string | null,
): string[] {
    return categories
        .filter((c) => c.parentId === parentId)
        .sort((a, b) => a.position - b.position || a.id.localeCompare(b.id))
        .map((c) => c.id);
}

function sortChanges(changes: CategoryPlacement[]): CategoryPlacement[] {
    return [...changes].sort((a, b) => a.id.localeCompare(b.id));
}

describe("moveCategory", () => {
    describe("reorder within same parent", () => {
        it("moves A1 forward to index 2 → A2, A3, A1; changes are A1, A2, A3", () => {
            const result = moveCategory(CATEGORIES, {
                id: "A1",
                parentId: "A",
                index: 2,
            });
            expect(result.ok).toBe(true);
            if (!result.ok) return;
            expect(
                childrenOf(applyChanges(CATEGORIES, result.changes), "A"),
            ).toEqual(["A2", "A3", "A1"]);
            expect(sortChanges(result.changes)).toEqual([
                { id: "A1", parentId: "A", position: 2 },
                { id: "A2", parentId: "A", position: 0 },
                { id: "A3", parentId: "A", position: 1 },
            ]);
        });

        it("moves A3 backward to index 0 → A3, A1, A2", () => {
            const result = moveCategory(CATEGORIES, {
                id: "A3",
                parentId: "A",
                index: 0,
            });
            expect(result.ok).toBe(true);
            if (!result.ok) return;
            expect(
                childrenOf(applyChanges(CATEGORIES, result.changes), "A"),
            ).toEqual(["A3", "A1", "A2"]);
            expect(sortChanges(result.changes)).toEqual([
                { id: "A1", parentId: "A", position: 1 },
                { id: "A2", parentId: "A", position: 2 },
                { id: "A3", parentId: "A", position: 0 },
            ]);
        });

        it("A2 to index 1 (same place) → ok with no changes", () => {
            expect(
                moveCategory(CATEGORIES, { id: "A2", parentId: "A", index: 1 }),
            ).toEqual({
                ok: true,
                changes: [],
            });
        });
    });

    describe("move to different parent", () => {
        it("moves A2 to B at index 0; only A2 and A3 appear in changes", () => {
            const result = moveCategory(CATEGORIES, {
                id: "A2",
                parentId: "B",
                index: 0,
            });
            expect(result.ok).toBe(true);
            if (!result.ok) return;
            const after = applyChanges(CATEGORIES, result.changes);
            expect(childrenOf(after, "B")).toEqual(["A2"]);
            expect(childrenOf(after, "A")).toEqual(["A1", "A3"]);
            expect(sortChanges(result.changes)).toEqual([
                { id: "A2", parentId: "B", position: 0 },
                { id: "A3", parentId: "A", position: 1 },
            ]);
        });

        it("promotes A1 to root at index 1 → A, A1, B, C; A children renumber; A1a not in changes", () => {
            const result = moveCategory(CATEGORIES, {
                id: "A1",
                parentId: null,
                index: 1,
            });
            expect(result.ok).toBe(true);
            if (!result.ok) return;
            const after = applyChanges(CATEGORIES, result.changes);
            expect(childrenOf(after, null)).toEqual(["A", "A1", "B", "C"]);
            expect(childrenOf(after, "A")).toEqual(["A2", "A3"]);
            expect(result.changes.map((c) => c.id)).not.toContain("A1a");
            expect(sortChanges(result.changes)).toEqual([
                { id: "A1", parentId: null, position: 1 },
                { id: "A2", parentId: "A", position: 0 },
                { id: "A3", parentId: "A", position: 1 },
                { id: "B", parentId: null, position: 2 },
                { id: "C", parentId: null, position: 3 },
            ]);
        });

        it("demotes root C into A at index 3 (end); only C appears in changes", () => {
            const result = moveCategory(CATEGORIES, {
                id: "C",
                parentId: "A",
                index: 3,
            });
            expect(result.ok).toBe(true);
            if (!result.ok) return;
            const after = applyChanges(CATEGORIES, result.changes);
            expect(childrenOf(after, "A")).toEqual(["A1", "A2", "A3", "C"]);
            expect(childrenOf(after, null)).toEqual(["A", "B"]);
            expect(result.changes).toEqual([
                { id: "C", parentId: "A", position: 3 },
            ]);
        });
    });

    describe("failures", () => {
        it("returns CATEGORY_NOT_FOUND for unknown id", () => {
            expect(
                moveCategory(CATEGORIES, { id: "X", parentId: null, index: 0 }),
            ).toEqual({
                ok: false,
                reason: "CATEGORY_NOT_FOUND",
            });
        });

        it("returns PARENT_NOT_FOUND for unknown parentId", () => {
            expect(
                moveCategory(CATEGORIES, { id: "A1", parentId: "X", index: 0 }),
            ).toEqual({
                ok: false,
                reason: "PARENT_NOT_FOUND",
            });
        });

        it("returns INTO_SELF_OR_DESCENDANT when parentId equals id", () => {
            expect(
                moveCategory(CATEGORIES, { id: "A", parentId: "A", index: 0 }),
            ).toEqual({
                ok: false,
                reason: "INTO_SELF_OR_DESCENDANT",
            });
        });

        it("returns INTO_SELF_OR_DESCENDANT when parentId is a grandchild (A into A1a)", () => {
            expect(
                moveCategory(CATEGORIES, {
                    id: "A",
                    parentId: "A1a",
                    index: 0,
                }),
            ).toEqual({
                ok: false,
                reason: "INTO_SELF_OR_DESCENDANT",
            });
        });

        it("returns INDEX_OUT_OF_RANGE for index -1", () => {
            expect(
                moveCategory(CATEGORIES, {
                    id: "A1",
                    parentId: "A",
                    index: -1,
                }),
            ).toEqual({
                ok: false,
                reason: "INDEX_OUT_OF_RANGE",
            });
        });

        it("returns INDEX_OUT_OF_RANGE for index beyond max (A1 within A: 2 siblings remain, max is 2, 3 is invalid)", () => {
            expect(
                moveCategory(CATEGORIES, { id: "A1", parentId: "A", index: 3 }),
            ).toEqual({
                ok: false,
                reason: "INDEX_OUT_OF_RANGE",
            });
        });

        it("returns INDEX_OUT_OF_RANGE for fractional index (1.5)", () => {
            expect(
                moveCategory(CATEGORIES, {
                    id: "A1",
                    parentId: "A",
                    index: 1.5,
                }),
            ).toEqual({
                ok: false,
                reason: "INDEX_OUT_OF_RANGE",
            });
        });
    });

    it("resolves gaps and duplicate positions by (position, id) then renumbers to 0..n-1", () => {
        const gapCategories: CategoryPlacement[] = [
            { id: "P", parentId: null, position: 0 },
            { id: "x", parentId: "P", position: 0 },
            { id: "y", parentId: "P", position: 5 },
            { id: "z", parentId: "P", position: 5 },
        ];
        const result = moveCategory(gapCategories, {
            id: "z",
            parentId: "P",
            index: 0,
        });
        expect(result.ok).toBe(true);
        if (!result.ok) return;
        expect(
            childrenOf(applyChanges(gapCategories, result.changes), "P"),
        ).toEqual(["z", "x", "y"]);
        expect(sortChanges(result.changes)).toEqual([
            { id: "x", parentId: "P", position: 1 },
            { id: "y", parentId: "P", position: 2 },
            { id: "z", parentId: "P", position: 0 },
        ]);
    });

    it("does not mutate the input array or its objects", () => {
        const mutable = CATEGORIES.map((c) => ({ ...c }));
        const snapshot = structuredClone(mutable);
        moveCategory(mutable, { id: "A2", parentId: "B", index: 0 });
        expect(mutable).toEqual(snapshot);
    });

    it("changes contain exactly id, parentId, position — no extra fields from input", () => {
        const withExtras = CATEGORIES.map((c) => ({ ...c, productCount: 42 }));
        const result = moveCategory(withExtras, {
            id: "A2",
            parentId: "B",
            index: 0,
        });
        expect(result.ok).toBe(true);
        if (!result.ok) return;
        expect(result.changes.length).toBeGreaterThan(0);
        for (const change of result.changes) {
            expect(Object.keys(change).sort()).toEqual([
                "id",
                "parentId",
                "position",
            ]);
        }
    });
});
