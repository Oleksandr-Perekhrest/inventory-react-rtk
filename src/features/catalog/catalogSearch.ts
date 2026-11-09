// outsource dependencies
import * as z from "zod";

// local dependencies
import type { ProductsParams } from "../../api/queries";

const catalogSearchSchema = z.object({
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
        .default("name")
        .catch("name"),
    order: z.enum(["asc", "desc"]).default("asc").catch("asc"),
    page: z.coerce.number().int().min(1).default(1).catch(1),
    pageSize: z.coerce.number().int().min(1).max(100).default(20).catch(20),
});

export const CATALOG_SEARCH_DEFAULTS = {
    sort: "name" as const,
    order: "asc" as const,
    page: 1,
    pageSize: 20,
};

export type CatalogSearch = z.output<typeof catalogSearchSchema>;

export { catalogSearchSchema };

export function toProductsParams(search: CatalogSearch): ProductsParams {
    return {
        ...search,
        includeDescendants: true,
    };
}
