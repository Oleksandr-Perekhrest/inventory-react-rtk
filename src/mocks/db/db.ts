// local dependencies
import { createSeed } from "../seed";
import type { Product, Category, Supplier, Movement } from "../../domain";
import {
    loadState,
    saveState,
    type DbState,
    type KeyValueStorage,
} from "./storage";

export type { DbState };

export type Db = {
    readonly categories: ReadonlyArray<Readonly<Category>>;
    readonly products: ReadonlyArray<Readonly<Product>>;
    readonly suppliers: ReadonlyArray<Readonly<Supplier>>;
    readonly movements: ReadonlyArray<Readonly<Movement>>;
    transaction<T>(fn: (state: DbState) => T): T;
    reset(): void;
};

export function createDb({
    storage,
    now = () => new Date(),
}: {
    storage: KeyValueStorage;
    now?: () => Date;
}): Db {
    let warnedOnce = false;

    function persist(data: DbState) {
        if (!saveState(storage, data) && !warnedOnce) {
            console.warn("[warehouse-manager] Failed to persist state.");
            warnedOnce = true;
        }
    }

    let state: DbState =
        loadState(storage) ??
        (() => {
            const seed = createSeed(now());
            persist(seed);
            return seed;
        })();

    return {
        get categories() {
            return state.categories as ReadonlyArray<Readonly<Category>>;
        },
        get products() {
            return state.products as ReadonlyArray<Readonly<Product>>;
        },
        get suppliers() {
            return state.suppliers as ReadonlyArray<Readonly<Supplier>>;
        },
        get movements() {
            return state.movements as ReadonlyArray<Readonly<Movement>>;
        },

        transaction<T>(fn: (draft: DbState) => T): T {
            const draft = structuredClone(state);
            const result = fn(draft);
            state = draft;
            persist(state);
            return result;
        },

        reset() {
            state = createSeed(now());
            persist(state);
        },
    };
}
