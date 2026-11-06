// outsource dependencies
import { z } from "zod";

export const UnitSchema = z.enum(["pcs", "kg", "l", "box"]);
export type Unit = z.infer<typeof UnitSchema>;

export const ProductSchema = z
    .object({
        id: z.string().min(1),
        sku: z.string().regex(/^[A-Z0-9-]+$/),
        name: z.string().trim().min(1),
        categoryId: z.string().min(1),
        unit: UnitSchema,
        price: z.int().gte(0),
        quantity: z.number().gte(0),
        minQuantity: z.number().gte(0),
        perishable: z.boolean(),
    })
    .superRefine((data, ctx) => {
        if (data.unit === "pcs" || data.unit === "box") {
            if (!Number.isInteger(data.quantity)) {
                ctx.addIssue({
                    code: "custom",
                    path: ["quantity"],
                    message: "Must be an integer for unit 'pcs' or 'box'",
                });
            }
            if (!Number.isInteger(data.minQuantity)) {
                ctx.addIssue({
                    code: "custom",
                    path: ["minQuantity"],
                    message: "Must be an integer for unit 'pcs' or 'box'",
                });
            }
        }
    });

export type Product = z.infer<typeof ProductSchema>;
