// outsource dependencies
import * as z from "zod";

// local dependencies
import {
    ProductSchema,
    CategorySchema,
    SupplierSchema,
    MovementSchema,
} from "../../domain";

export interface KeyValueStorage {
    getItem(key: string): string | null;
    setItem(key: string, value: string): void;
    removeItem(key: string): void;
}

export function createMemoryStorage(): KeyValueStorage {
    const store = new Map<string, string>();
    return {
        getItem: (key) => store.get(key) ?? null,
        setItem: (key, value) => {
            store.set(key, value);
        },
        removeItem: (key) => {
            store.delete(key);
        },
    };
}

export const STORAGE_KEY = "warehouse-manager:db";
// DB_VERSION must be bumped whenever the shape of stored data changes
export const DB_VERSION = 2;

const EnvelopeSchema = z.object({
    version: z.literal(DB_VERSION),
    data: z.object({
        categories: z.array(CategorySchema),
        products: z.array(ProductSchema),
        suppliers: z.array(SupplierSchema),
        movements: z.array(MovementSchema),
    }),
});

export type DbState = z.infer<typeof EnvelopeSchema>["data"];

export function loadState(storage: KeyValueStorage): DbState | null {
    try {
        const raw = storage.getItem(STORAGE_KEY);
        if (raw === null) return null;
        const result = EnvelopeSchema.safeParse(JSON.parse(raw));
        return result.success ? result.data.data : null;
    } catch {
        return null;
    }
}

export function saveState(storage: KeyValueStorage, data: DbState): boolean {
    try {
        storage.setItem(
            STORAGE_KEY,
            JSON.stringify({ version: DB_VERSION, data }),
        );
        return true;
    } catch {
        return false;
    }
}
