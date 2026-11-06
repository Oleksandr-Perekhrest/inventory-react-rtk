// local dependencies
import { createSeed } from "../seed";
import { loadState, saveState, type KeyValueStorage } from "./storage";
import type { Product, Category, Supplier, Movement } from "../../domain";

export type DbState = {
    categories: Category[];
    products: Product[];
    suppliers: Supplier[];
    movements: Movement[];
};

export type Db = {
    readonly categories: ReadonlyArray<Category>;
    readonly products: ReadonlyArray<Product>;
    readonly suppliers: ReadonlyArray<Supplier>;
    readonly movements: ReadonlyArray<Movement>;
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
    let state: DbState =
        loadState(storage) ??
        (() => {
            const seed = createSeed(now());
            saveState(storage, seed);
            return seed;
        })();

    return {
        get categories() {
            return state.categories as ReadonlyArray<Category>;
        },
        get products() {
            return state.products as ReadonlyArray<Product>;
        },
        get suppliers() {
            return state.suppliers as ReadonlyArray<Supplier>;
        },
        get movements() {
            return state.movements as ReadonlyArray<Movement>;
        },

        transaction<T>(fn: (draft: DbState) => T): T {
            const draft = structuredClone(state);
            const result = fn(draft);
            state = draft;
            saveState(storage, state);
            return result;
        },

        reset() {
            state = createSeed(now());
            saveState(storage, state);
        },
    };
}
