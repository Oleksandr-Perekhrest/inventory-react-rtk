// outsource dependencies
import * as z from "zod";

// local dependencies
import { MovementTypeSchema } from "../domain";

export const paginationQuery = {
    page: z.coerce.number().int().gte(1).default(1),
    pageSize: z.coerce.number().int().gte(1).lte(100).default(20),
};

export const categoriesQuerySchema = z.object({});
export const suppliersQuerySchema = z.object({});
export const getProductQuerySchema = z.object({});

export const listProductsQuerySchema = z.object({
    ...paginationQuery,
    q: z.string().trim().optional(),
    sort: z.enum(["name", "sku", "quantity", "price"]).default("name"),
    order: z.enum(["asc", "desc"]).default("asc"),
    stock: z.enum(["low", "out"]).optional(),
    categoryId: z.string().optional(),
    includeDescendants: z
        .enum(["true", "false"])
        .default("true")
        .transform((v) => v === "true"),
});

export const movementsQuerySchema = z.object({
    ...paginationQuery,
    to: z.iso.date().optional(),
    from: z.iso.date().optional(),
    type: MovementTypeSchema.optional(),
    order: z.enum(["asc", "desc"]).default("desc"),
    productId: z.string().optional(),
});

export const moveCategoryBodySchema = z.strictObject({
    parentId: z.string().min(1).nullable(),
    index: z.int(),
});

export const updateProductBodySchema = z.strictObject({
    categoryId: z.string().min(1),
});

export type MoveCategoryBody = z.infer<typeof moveCategoryBodySchema>;
export type UpdateProductBody = z.infer<typeof updateProductBodySchema>;
export type ListProductsQuery = z.output<typeof listProductsQuerySchema>;
export type MovementsQuery = z.output<typeof movementsQuerySchema>;

export type ProductsParams = Partial<z.output<typeof listProductsQuerySchema>>;
export type MovementsParams = Partial<z.output<typeof movementsQuerySchema>>;
