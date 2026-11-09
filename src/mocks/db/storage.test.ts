// outsource dependencies
import { it, expect, describe } from "vitest";

// local dependencies
import { createSeed } from "../seed";
import {
    loadState,
    saveState,
    DB_VERSION,
    STORAGE_KEY,
    createMemoryStorage,
} from "./storage";

const FIXED_NOW = new Date("2026-11-06T07:00:00Z");

describe("loadState", () => {
    it("returns the data for a valid envelope (control)", () => {
        const storage = createMemoryStorage();
        const data = createSeed(FIXED_NOW);
        saveState(storage, data);
        expect(loadState(storage)).toEqual(data);
    });

    it("returns null for a missing key", () => {
        const storage = createMemoryStorage();
        expect(loadState(storage)).toBeNull();
    });

    it("returns null for invalid JSON", () => {
        const storage = createMemoryStorage();
        storage.setItem(STORAGE_KEY, "not-json{");
        expect(loadState(storage)).toBeNull();
    });

    it("returns null for a different version", () => {
        const storage = createMemoryStorage();
        const data = createSeed(FIXED_NOW);
        storage.setItem(
            STORAGE_KEY,
            JSON.stringify({ version: DB_VERSION + 1, data }),
        );
        expect(loadState(storage)).toBeNull();
    });

    it("returns null when a product has an invalid sku", () => {
        const storage = createMemoryStorage();
        const data = createSeed(FIXED_NOW);
        data.products[0].sku = "invalid-lowercase";
        storage.setItem(
            STORAGE_KEY,
            JSON.stringify({ version: DB_VERSION, data }),
        );
        expect(loadState(storage)).toBeNull();
    });
});

describe("saveState", () => {
    it("returns true and a following loadState gives the same data back (control)", () => {
        const storage = createMemoryStorage();
        const data = createSeed(FIXED_NOW);
        expect(saveState(storage, data)).toBe(true);
        expect(loadState(storage)).toEqual(data);
    });

    it("returns false and does not throw when setItem throws", () => {
        const storage = {
            getItem: () => null as string | null,
            setItem: (): void => {
                throw new Error("quota exceeded");
            },
            removeItem: () => {},
        };
        const data = createSeed(FIXED_NOW);
        expect(() => saveState(storage, data)).not.toThrow();
        expect(saveState(storage, data)).toBe(false);
    });
});
