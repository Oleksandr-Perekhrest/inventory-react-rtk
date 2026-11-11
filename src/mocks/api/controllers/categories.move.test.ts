// outsource dependencies
import { it, expect, describe, beforeEach } from "vitest";

// local dependencies
import { createDb } from "../../db";
import { ApiError } from "../errors";
import { moveCategoryController } from "./categories";
import { createMemoryStorage } from "../../db/storage";

const FIXED_NOW = new Date("2026-11-06T07:00:00Z");

let storage = createMemoryStorage();
let db = createDb({ storage, now: () => FIXED_NOW });

describe("moveCategoryController", () => {
    beforeEach(() => {
        storage = createMemoryStorage();
        db = createDb({ storage, now: () => FIXED_NOW });
    });

    it("success: moves cat-milk-cream (leaf) from cat-dairy to cat-packaging at index 0", () => {
        const result = moveCategoryController({
            db,
            params: { id: "cat-milk-cream" },
            body: { parentId: "cat-packaging", index: 0 },
        });

        expect(result).toEqual({ status: 204 });

        const moved = db.categories.find((c) => c.id === "cat-milk-cream");
        expect(moved?.parentId).toBe("cat-packaging");
        expect(moved?.position).toBe(0);

        // Every parent's children must have contiguous positions 0..n-1
        const parentIds = new Set(
            db.categories
                .map((c) => c.parentId)
                .filter((p): p is string => p !== null),
        );
        for (const parentId of parentIds) {
            const children = [...db.categories]
                .filter((c) => c.parentId === parentId)
                .sort((a, b) => a.position - b.position);
            children.forEach((c, i) => {
                expect(c.position).toBe(i);
            });
        }

        // Former sibling cat-butter-yogurt was at position 2, must be renumbered to 1
        const butterYogurt = db.categories.find(
            (c) => c.id === "cat-butter-yogurt",
        );
        expect(butterYogurt?.position).toBe(1);
    });

    it("success is persisted: a second db from the same storage sees the moved category", () => {
        moveCategoryController({
            db,
            params: { id: "cat-milk-cream" },
            body: { parentId: "cat-packaging", index: 0 },
        });

        const db2 = createDb({ storage, now: () => FIXED_NOW });
        const moved = db2.categories.find((c) => c.id === "cat-milk-cream");
        expect(moved?.parentId).toBe("cat-packaging");
        expect(moved?.position).toBe(0);
    });

    it("same place: returns 204 and db.categories is unchanged", () => {
        // cat-milk-cream is at position 1 in cat-dairy; moving it to index 1 is a no-op
        const before = structuredClone([...db.categories]);
        const result = moveCategoryController({
            db,
            params: { id: "cat-milk-cream" },
            body: { parentId: "cat-dairy", index: 1 },
        });
        expect(result).toEqual({ status: 204 });
        expect([...db.categories]).toEqual(before);
    });

    it("unknown id throws 404 NOT_FOUND and db is unchanged", () => {
        const before = structuredClone([...db.categories]);
        let thrown: unknown;
        try {
            moveCategoryController({
                db,
                params: { id: "cat-nonexistent" },
                body: { parentId: "cat-packaging", index: 0 },
            });
        } catch (e) {
            thrown = e;
        }
        expect(thrown).toBeInstanceOf(ApiError);
        if (thrown instanceof ApiError) {
            expect(thrown.status).toBe(404);
            expect(thrown.code).toBe("NOT_FOUND");
        }
        expect([...db.categories]).toEqual(before);
    });

    it("unknown parentId throws 404 NOT_FOUND and db is unchanged", () => {
        const before = structuredClone([...db.categories]);
        let thrown: unknown;
        try {
            moveCategoryController({
                db,
                params: { id: "cat-frozen" },
                body: { parentId: "cat-nonexistent", index: 0 },
            });
        } catch (e) {
            thrown = e;
        }
        expect(thrown).toBeInstanceOf(ApiError);
        if (thrown instanceof ApiError) {
            expect(thrown.status).toBe(404);
            expect(thrown.code).toBe("NOT_FOUND");
        }
        expect([...db.categories]).toEqual(before);
    });

    it("move parent into own child throws 422 INVALID_MOVE with fields.parentId and db is unchanged", () => {
        // cat-cheese is a child of cat-dairy; moving cat-dairy into cat-cheese is illegal
        const before = structuredClone([...db.categories]);
        let thrown: unknown;
        try {
            moveCategoryController({
                db,
                params: { id: "cat-dairy" },
                body: { parentId: "cat-cheese", index: 0 },
            });
        } catch (e) {
            thrown = e;
        }
        expect(thrown).toBeInstanceOf(ApiError);
        if (thrown instanceof ApiError) {
            expect(thrown.status).toBe(422);
            expect(thrown.code).toBe("INVALID_MOVE");
            expect(thrown.fields).toHaveProperty("parentId");
        }
        expect([...db.categories]).toEqual(before);
    });

    it("index too large throws 422 INVALID_MOVE with fields.index and db is unchanged", () => {
        // cat-dairy has 3 children; moving cat-frozen there at index 4 exceeds the max of 3
        const before = structuredClone([...db.categories]);
        let thrown: unknown;
        try {
            moveCategoryController({
                db,
                params: { id: "cat-frozen" },
                body: { parentId: "cat-dairy", index: 4 },
            });
        } catch (e) {
            thrown = e;
        }
        expect(thrown).toBeInstanceOf(ApiError);
        if (thrown instanceof ApiError) {
            expect(thrown.status).toBe(422);
            expect(thrown.code).toBe("INVALID_MOVE");
            expect(thrown.fields).toHaveProperty("index");
        }
        expect([...db.categories]).toEqual(before);
    });
});
