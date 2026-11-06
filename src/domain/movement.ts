// outsource dependencies
import { z } from "zod";

export const MovementTypeSchema = z.enum([
    "receipt",
    "shipment",
    "write-off",
    "adjustment",
]);
export type MovementType = z.infer<typeof MovementTypeSchema>;

export const MovementSchema = z
    .object({
        id: z.string().min(1),
        type: MovementTypeSchema,
        productId: z.string().min(1),
        quantity: z
            .number()
            .refine((v) => v !== 0, "Quantity must be non-zero"),
        date: z.iso.datetime(),
        reference: z.string().min(1),
        supplierId: z.string().optional(),
        batch: z.string().optional(),
        expiresAt: z.iso.date().optional(),
        comment: z.string().optional(),
    })
    .superRefine((data, ctx) => {
        if (data.type === "receipt") {
            if (data.quantity <= 0) {
                ctx.addIssue({
                    code: "custom",
                    path: ["quantity"],
                    message: "Quantity must be positive for a receipt",
                });
            }
            if (!data.supplierId) {
                ctx.addIssue({
                    code: "custom",
                    path: ["supplierId"],
                    message: "supplierId is required for a receipt",
                });
            }
        } else if (data.type === "shipment" || data.type === "write-off") {
            if (data.quantity >= 0) {
                ctx.addIssue({
                    code: "custom",
                    path: ["quantity"],
                    message: `Quantity must be negative for a ${data.type}`,
                });
            }
        }
    });

export type Movement = z.infer<typeof MovementSchema>;
