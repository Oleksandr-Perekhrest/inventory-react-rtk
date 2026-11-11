// outsource dependencies
import { it, expect, describe } from "vitest";

// local dependencies
import type { CategoryWithCounts } from "@/api/types";
import { categoriesAdapter } from "@/api/endpoints/categories";
import {
    getDropZone,
    isProductDndData,
    isCategoryDndData,
    resolveProductDrop,
    resolveCategoryDrop,
    describeCategoryMove,
} from "./dnd";

// Fixture — 5 categories:  ROOT → [A(0), B(1)]  A → [A1(0), A2(1)]  A1 → [A1a(0)]  B has no children
function c(
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

const state = categoriesAdapter.setAll(categoriesAdapter.getInitialState(), [
    c("A", null, 0),
    c("B", null, 1),
    c("A1", "A", 0),
    c("A2", "A", 1),
    c("A1a", "A1", 0),
]);

describe("getDropZone", () => {
    const rect = { top: 100, height: 30 };

    it("y in the top third → before", () => {
        expect(getDropZone(105, rect)).toBe("before");
    });

    it("y in the middle third → inside", () => {
        expect(getDropZone(115, rect)).toBe("inside");
    });

    it("y in the bottom third → after", () => {
        expect(getDropZone(125, rect)).toBe("after");
    });

    it("y above the rect → before", () => {
        expect(getDropZone(50, rect)).toBe("before");
    });

    it("y below the rect → after", () => {
        expect(getDropZone(200, rect)).toBe("after");
    });

    it("y=110 (relative exactly equals third=10, strict-< boundary) → inside", () => {
        expect(getDropZone(110, rect)).toBe("inside");
    });

    it("y=120 (relative exactly equals 2×third=20, strict-> boundary) → inside", () => {
        expect(getDropZone(120, rect)).toBe("inside");
    });
});

describe("resolveCategoryDrop", () => {
    describe("valid moves return a MoveCategoryInput", () => {
        it("before A1 when dragging A2 → index 0 among siblings without A2", () => {
            const result = resolveCategoryDrop(state, {
                draggedId: "A2",
                targetId: "A1",
                zone: "before",
                targetExpanded: false,
            });
            expect(result).toEqual({ id: "A2", parentId: "A", index: 0 });
        });

        it("after A2 when dragging A1 (collapsed) → index 1 among siblings without A1", () => {
            const result = resolveCategoryDrop(state, {
                draggedId: "A1",
                targetId: "A2",
                zone: "after",
                targetExpanded: false,
            });
            expect(result).toEqual({ id: "A1", parentId: "A", index: 1 });
        });

        it("inside A2 when dragging A1 → first child of A2 at index 0", () => {
            const result = resolveCategoryDrop(state, {
                draggedId: "A1",
                targetId: "A2",
                zone: "inside",
                targetExpanded: false,
            });
            expect(result).toEqual({ id: "A1", parentId: "A2", index: 0 });
        });

        it("inside B when dragging A1 (B is a leaf) → index 0", () => {
            const result = resolveCategoryDrop(state, {
                draggedId: "A1",
                targetId: "B",
                zone: "inside",
                targetExpanded: false,
            });
            expect(result).toEqual({ id: "A1", parentId: "B", index: 0 });
        });

        it("after A (expanded, has children) when dragging B → goes inside A as first child at index 0", () => {
            const result = resolveCategoryDrop(state, {
                draggedId: "B",
                targetId: "A",
                zone: "after",
                targetExpanded: true,
            });
            expect(result).toEqual({ id: "B", parentId: "A", index: 0 });
        });

        it("after A (collapsed, has children) when dragging A2 → goes to root level after A, not inside A", () => {
            const result = resolveCategoryDrop(state, {
                draggedId: "A2",
                targetId: "A",
                zone: "after",
                targetExpanded: false,
            });
            expect(result).toEqual({ id: "A2", parentId: null, index: 1 });
        });
    });

    describe("returns null for no-op or invalid moves", () => {
        it("dragging a category onto itself", () => {
            const result = resolveCategoryDrop(state, {
                draggedId: "A1",
                targetId: "A1",
                zone: "inside",
                targetExpanded: false,
            });
            expect(result).toBeNull();
        });

        it("dropping A into A1a (a descendant of A)", () => {
            const result = resolveCategoryDrop(state, {
                draggedId: "A",
                targetId: "A1a",
                zone: "inside",
                targetExpanded: false,
            });
            expect(result).toBeNull();
        });

        it("before A2 when dragging A1 — no-op because A1 is already at position 0 before A2", () => {
            const result = resolveCategoryDrop(state, {
                draggedId: "A1",
                targetId: "A2",
                zone: "before",
                targetExpanded: false,
            });
            expect(result).toBeNull();
        });
    });
});

describe("resolveProductDrop", () => {
    it("returns null when target category is the same", () => {
        expect(
            resolveProductDrop({ productId: "p1", categoryId: "A" }, "A"),
        ).toBeNull();
    });

    it("returns the new assignment when target is a different category", () => {
        expect(
            resolveProductDrop({ productId: "p1", categoryId: "A" }, "B"),
        ).toEqual({ id: "p1", categoryId: "B" });
    });
});

describe("isCategoryDndData", () => {
    it("returns true for a valid CategoryDndData object", () => {
        expect(isCategoryDndData({ categoryId: "A" })).toBe(true);
    });

    it("returns false for null", () => {
        expect(isCategoryDndData(null)).toBe(false);
    });

    it("returns false for a string", () => {
        expect(isCategoryDndData("category:A")).toBe(false);
    });

    it("returns false when categoryId is not a string", () => {
        expect(isCategoryDndData({ categoryId: 42 })).toBe(false);
    });

    it("returns false for an object without categoryId (ProductDndData shape without it)", () => {
        expect(isCategoryDndData({ productId: "p1", name: "Widget" })).toBe(
            false,
        );
    });
});

describe("isProductDndData", () => {
    it("returns true for a valid ProductDndData object", () => {
        expect(
            isProductDndData({
                productId: "p1",
                categoryId: "A",
                name: "Widget",
            }),
        ).toBe(true);
    });

    it("returns false for null", () => {
        expect(isProductDndData(null)).toBe(false);
    });

    it("returns false for a string", () => {
        expect(isProductDndData("product:p1")).toBe(false);
    });

    it("returns false when productId is not a string", () => {
        expect(
            isProductDndData({
                productId: 42,
                categoryId: "A",
                name: "Widget",
            }),
        ).toBe(false);
    });

    it("returns false for a CategoryDndData-shaped object (missing productId and name)", () => {
        expect(isProductDndData({ categoryId: "A" })).toBe(false);
    });
});

describe("describeCategoryMove", () => {
    it("returns the quoted parent name as destination when moving to a parent", () => {
        expect(
            describeCategoryMove(state, { id: "A1", parentId: "A", index: 0 }),
        ).toEqual({ name: "A1", destination: '"A"' });
    });

    it("returns 'top level' as destination when moving to root (parentId null)", () => {
        expect(
            describeCategoryMove(state, { id: "A1", parentId: null, index: 0 }),
        ).toEqual({ name: "A1", destination: "top level" });
    });

    it("falls back to the id string as name for an unknown source id", () => {
        expect(
            describeCategoryMove(state, {
                id: "GHOST",
                parentId: "A",
                index: 0,
            }),
        ).toEqual({ name: "GHOST", destination: '"A"' });
    });

    it("falls back to the quoted parentId string as destination for an unknown parent id", () => {
        expect(
            describeCategoryMove(state, {
                id: "A1",
                parentId: "GHOST_P",
                index: 0,
            }),
        ).toEqual({ name: "A1", destination: '"GHOST_P"' });
    });
});
