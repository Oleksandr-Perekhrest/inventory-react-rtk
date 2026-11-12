// outsource dependencies
import * as z from "zod";

// local dependencies
import type { ProductsParams } from "@/api/queries";

export const CATALOG_SEARCH_DEFAULTS = {
    sort: "name",
    order: "asc",
    page: 1,
    pageSize: 10,
} as const;

export const catalogSearchSchema = z.object({
    categoryId: z.string().optional().catch(undefined),
    q: z
        .string()
        .trim()
        .transform((v) => (v === "" ? undefined : v))
        .optional()
        .catch(undefined),
    stock: z.enum(["low", "out"]).optional().catch(undefined),
    sort: z
        .enum(["name", "sku", "quantity", "price"])
        .default(CATALOG_SEARCH_DEFAULTS.sort)
        .catch(CATALOG_SEARCH_DEFAULTS.sort),
    order: z
        .enum(["asc", "desc"])
        .default(CATALOG_SEARCH_DEFAULTS.order)
        .catch(CATALOG_SEARCH_DEFAULTS.order),
    page: z.coerce
        .number()
        .int()
        .min(1)
        .default(CATALOG_SEARCH_DEFAULTS.page)
        .catch(CATALOG_SEARCH_DEFAULTS.page),
    pageSize: z.coerce
        .number()
        .int()
        .min(1)
        .max(100)
        .default(CATALOG_SEARCH_DEFAULTS.pageSize)
        .catch(CATALOG_SEARCH_DEFAULTS.pageSize),
});

export type CatalogSearch = z.output<typeof catalogSearchSchema>;

export function toProductsParams(search: CatalogSearch): ProductsParams {
    return {
        ...search,
        includeDescendants: true,
    };
}
