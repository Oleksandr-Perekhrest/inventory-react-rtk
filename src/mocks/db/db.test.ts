// outsource dependencies
import { it, vi, expect, describe, afterEach } from "vitest";

// local dependencies
import { createSeed } from "../seed";
import { type Db, createDb } from "./db";
import {
    loadState,
    saveState,
    STORAGE_KEY,
    createMemoryStorage,
} from "./storage";

const FIXED_NOW = new Date("2026-11-06T07:00:00Z");

describe("createDb", () => {
    it("seeds from createSeed(now) when storage is empty and saves it immediately", () => {
        const storage = createMemoryStorage();
        const db = createDb({ storage, now: () => FIXED_NOW });
        const expected = createSeed(FIXED_NOW);
        expect(db.categories).toEqual(expected.categories);
        expect(db.products).toEqual(expected.products);
        expect(db.suppliers).toEqual(expected.suppliers);
        expect(db.movements).toEqual(expected.movements);
        expect(loadState(storage)).toEqual(expected);
    });

    it("loads existing stored data without reseeding", () => {
        const storage = createMemoryStorage();
        const seed = createSeed(FIXED_NOW);
        seed.products[0].name = "MODIFIED NAME";
        saveState(storage, seed);
        const db = createDb({ storage, now: () => FIXED_NOW });
        expect(db.products[0].name).toBe("MODIFIED NAME");
    });

    it("reseeds and overwrites storage when stored data is corrupt", () => {
        const storage = createMemoryStorage();
        storage.setItem(STORAGE_KEY, "not-json{");
        const db = createDb({ storage, now: () => FIXED_NOW });
        const expected = createSeed(FIXED_NOW);
        expect(db.products).toEqual(expected.products);
        expect(loadState(storage)).toEqual(expected);
    });

    describe("transaction", () => {
        it("commits the change, saves to storage, and returns fn's return value", () => {
            const storage = createMemoryStorage();
            const db = createDb({ storage, now: () => FIXED_NOW });
            const originalQty = db.products[0].quantity;

            const result = db.transaction((draft) => {
                draft.products[0].quantity = originalQty + 100;
                return "done";
            });

            expect(result).toBe("done");
            expect(db.products[0].quantity).toBe(originalQty + 100);
            expect(loadState(storage)!.products[0].quantity).toBe(
                originalQty + 100,
            );
        });

        it("rolls back when fn throws, rethrowing the error and leaving storage unchanged", () => {
            const storage = createMemoryStorage();
            const db = createDb({ storage, now: () => FIXED_NOW });
            const stateBefore = loadState(storage)!;
            const rawBefore = storage.getItem(STORAGE_KEY)!;

            expect(() =>
                db.transaction((draft) => {
                    draft.products[0].quantity = 9999;
                    throw new Error("oops");
                }),
            ).toThrow("oops");

            expect(db.products).toEqual(stateBefore.products);
            expect(db.categories).toEqual(stateBefore.categories);
            expect(db.suppliers).toEqual(stateBefore.suppliers);
            expect(db.movements).toEqual(stateBefore.movements);
            expect(storage.getItem(STORAGE_KEY)).toBe(rawBefore);
        });

        it("array ref captured before the transaction still holds the old values", () => {
            const storage = createMemoryStorage();
            const db = createDb({ storage, now: () => FIXED_NOW });
            const snapshot = db.products;
            const nameBefore = snapshot[0].name;

            db.transaction((draft) => {
                draft.products[0].name = "AFTER TRANSACTION";
            });

            expect(db.products[0].name).toBe("AFTER TRANSACTION");
            expect(snapshot[0].name).toBe(nameBefore);
        });
    });

    it("reset replaces state with createSeed(now) and saves it", () => {
        const storage = createMemoryStorage();
        const db = createDb({ storage, now: () => FIXED_NOW });
        db.transaction((draft) => {
            draft.products[0].name = "CHANGED";
        });
        expect(db.products[0].name).toBe("CHANGED");

        db.reset();

        const expected = createSeed(FIXED_NOW);
        expect(db.products).toEqual(expected.products);
        expect(loadState(storage)).toEqual(expected);
    });

    describe("failing storage", () => {
        afterEach(() => {
            vi.restoreAllMocks();
        });

        it("createDb and transactions still work in memory (control)", () => {
            vi.spyOn(console, "warn").mockImplementation(() => {});
            const failing = {
                getItem: () => null as string | null,
                setItem: (): void => {
                    throw new Error("quota exceeded");
                },
                removeItem: () => {},
            };
            const db = createDb({ storage: failing, now: () => FIXED_NOW });
            expect(db.products).toEqual(createSeed(FIXED_NOW).products);
            db.transaction((draft) => {
                draft.products[0].quantity = 9999;
            });
            expect(db.products[0].quantity).toBe(9999);
        });

        it("warns exactly once per instance across startup and multiple transactions", () => {
            const warnSpy = vi
                .spyOn(console, "warn")
                .mockImplementation(() => {});
            const failing = {
                getItem: () => null as string | null,
                setItem: (): void => {
                    throw new Error("quota exceeded");
                },
                removeItem: () => {},
            };

            const db1 = createDb({ storage: failing, now: () => FIXED_NOW });
            expect(warnSpy).toHaveBeenCalledTimes(1);

            db1.transaction((draft) => {
                draft.products[0].quantity = 1;
            });
            db1.transaction((draft) => {
                draft.products[0].quantity = 2;
            });
            expect(warnSpy).toHaveBeenCalledTimes(1);

            createDb({ storage: failing, now: () => FIXED_NOW });
            expect(warnSpy).toHaveBeenCalledTimes(2);
        });
    });

    it("type safety: assigning to element fields and calling push are type errors", () => {
        function _typeChecksOnly(db: Db): void {
            // @ts-expect-error – product element fields are readonly
            db.products[0].quantity = 0;
            // @ts-expect-error – products array is readonly
            db.products.push(db.products[0]);
        }
        void _typeChecksOnly;
    });
});
