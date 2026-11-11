// outsource dependencies
import { it, expect, describe } from "vitest";

// local dependencies
import type { CategoryWithCounts } from "./types";
import { categoriesAdapter } from "./endpoints/categories";
import { isCategoryWithin, matchesCategoryFilter } from "./productSelection";

function makeCategory(id: string, parentId: string | null): CategoryWithCounts {
    return {
        id,
        name: id,
        parentId,
        position: 0,
        productCount: 0,
        totalProductCount: 0,
    };
}

// R -> C -> G chain; S separate root; X <-> Y cycle pair
const categories = categoriesAdapter.setAll(
    categoriesAdapter.getInitialState(),
    [
        makeCategory("cat-R", null),
        makeCategory("cat-C", "cat-R"),
        makeCategory("cat-G", "cat-C"),
        makeCategory("cat-S", null),
        makeCategory("cat-X", "cat-Y"),
        makeCategory("cat-Y", "cat-X"),
    ],
);

describe("isCategoryWithin", () => {
    it("G within R returns true", () => {
        expect(isCategoryWithin(categories, "cat-G", "cat-R")).toBe(true);
    });

    it("G within C returns true", () => {
        expect(isCategoryWithin(categories, "cat-G", "cat-C")).toBe(true);
    });

    it("R within G returns false", () => {
        expect(isCategoryWithin(categories, "cat-R", "cat-G")).toBe(false);
    });

    it("S within R returns false", () => {
        expect(isCategoryWithin(categories, "cat-S", "cat-R")).toBe(false);
    });

    it("a category within itself returns true", () => {
        expect(isCategoryWithin(categories, "cat-R", "cat-R")).toBe(true);
    });

    it("unknown categoryId returns false", () => {
        expect(isCategoryWithin(categories, "cat-unknown", "cat-R")).toBe(
            false,
        );
    });

    it("cycle in parentId terminates and returns false for unrelated ancestor", () => {
        expect(isCategoryWithin(categories, "cat-X", "cat-R")).toBe(false);
    });
});

describe("matchesCategoryFilter", () => {
    it("no categoryId in params returns true for any product category", () => {
        expect(matchesCategoryFilter("cat-G", {}, categories)).toBe(true);
    });

    it("includeDescendants undefined behaves like true: G matches R", () => {
        expect(
            matchesCategoryFilter("cat-G", { categoryId: "cat-R" }, categories),
        ).toBe(true);
    });

    it("includeDescendants true: G matches R", () => {
        expect(
            matchesCategoryFilter(
                "cat-G",
                { categoryId: "cat-R", includeDescendants: true },
                categories,
            ),
        ).toBe(true);
    });

    it("includeDescendants false: G does not match R", () => {
        expect(
            matchesCategoryFilter(
                "cat-G",
                { categoryId: "cat-R", includeDescendants: false },
                categories,
            ),
        ).toBe(false);
    });

    it("includeDescendants false: R matches R exactly", () => {
        expect(
            matchesCategoryFilter(
                "cat-R",
                { categoryId: "cat-R", includeDescendants: false },
                categories,
            ),
        ).toBe(true);
    });
});
