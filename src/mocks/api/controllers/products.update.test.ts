// outsource dependencies
import { it, expect, describe, beforeEach } from "vitest";

// local dependencies
import { createDb } from "../../db";
import { ApiError } from "../errors";
import { updateProductController } from "./products";
import { createMemoryStorage } from "../../db/storage";

const FIXED_NOW = new Date("2026-11-06T07:00:00Z");

let storage = createMemoryStorage();
let db = createDb({ storage, now: () => FIXED_NOW });

describe("updateProductController", () => {
    beforeEach(() => {
        storage = createMemoryStorage();
        db = createDb({ storage, now: () => FIXED_NOW });
    });

    it("success: moves prd-0001 from cat-hard-cheese to cat-soft-cheese", () => {
        const movementsBefore = db.movements.length;

        const result = updateProductController({
            db,
            params: { id: "prd-0001" },
            body: { categoryId: "cat-soft-cheese" },
        });

        expect(result.body.categoryId).toBe("cat-soft-cheese");

        const updated = db.products.find((p) => p.id === "prd-0001");
        expect(updated?.categoryId).toBe("cat-soft-cheese");

        expect(db.movements.length).toBe(movementsBefore);

        const db2 = createDb({ storage, now: () => FIXED_NOW });
        const updatedInDb2 = db2.products.find((p) => p.id === "prd-0001");
        expect(updatedInDb2?.categoryId).toBe("cat-soft-cheese");
    });

    it("same category: returns the product unchanged and db.products deep-equals before", () => {
        const before = structuredClone([...db.products]);

        const result = updateProductController({
            db,
            params: { id: "prd-0001" },
            body: { categoryId: "cat-hard-cheese" },
        });

        expect(result.body.categoryId).toBe("cat-hard-cheese");
        expect([...db.products]).toEqual(before);
    });

    it("unknown product throws 404 NOT_FOUND and db.products is unchanged", () => {
        const before = structuredClone([...db.products]);
        let thrown: unknown;

        try {
            updateProductController({
                db,
                params: { id: "prd-nonexistent" },
                body: { categoryId: "cat-hard-cheese" },
            });
        } catch (e) {
            thrown = e;
        }

        expect(thrown).toBeInstanceOf(ApiError);
        if (thrown instanceof ApiError) {
            expect(thrown.status).toBe(404);
            expect(thrown.code).toBe("NOT_FOUND");
        }
        expect([...db.products]).toEqual(before);
    });

    it("unknown category throws 404 NOT_FOUND and db.products is unchanged", () => {
        const before = structuredClone([...db.products]);
        let thrown: unknown;

        try {
            updateProductController({
                db,
                params: { id: "prd-0001" },
                body: { categoryId: "cat-nonexistent" },
            });
        } catch (e) {
            thrown = e;
        }

        expect(thrown).toBeInstanceOf(ApiError);
        if (thrown instanceof ApiError) {
            expect(thrown.status).toBe(404);
            expect(thrown.code).toBe("NOT_FOUND");
        }
        expect([...db.products]).toEqual(before);
    });
});
