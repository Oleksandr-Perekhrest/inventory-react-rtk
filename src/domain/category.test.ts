// outsource dependencies
import { it, expect, describe } from "vitest";

// local dependencies
import { CategorySchema } from "./category";

const base = {
    id: "cat-dairy",
    name: "Dairy",
    parentId: "cat-food",
    position: 0,
};

describe("CategorySchema", () => {
    it("accepts a valid category", () => {
        expect(CategorySchema.safeParse(base).success).toBe(true);
    });

    it("accepts position 0", () => {
        expect(CategorySchema.safeParse({ ...base, position: 0 }).success).toBe(
            true,
        );
    });

    it("rejects position -1", () => {
        const result = CategorySchema.safeParse({ ...base, position: -1 });
        expect(result.success).toBe(false);
        if (!result.success) {
            expect(
                result.error.issues.some((i) => i.path[0] === "position"),
            ).toBe(true);
        }
    });

    it("rejects fractional position 1.5", () => {
        const result = CategorySchema.safeParse({ ...base, position: 1.5 });
        expect(result.success).toBe(false);
        if (!result.success) {
            expect(
                result.error.issues.some((i) => i.path[0] === "position"),
            ).toBe(true);
        }
    });

    it("accepts parentId null for root categories", () => {
        expect(
            CategorySchema.safeParse({ ...base, parentId: null }).success,
        ).toBe(true);
    });
});
