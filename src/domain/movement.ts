// outsource dependencies
import * as z from "zod";

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
        quantity: z.number(),
        date: z.iso.datetime(),
        reference: z.string().min(1),
        supplierId: z.string().optional(),
        batch: z.string().optional(),
        expiresAt: z.iso.date().optional(),
        comment: z.string().optional(),
        expectedQuantity: z.number().gte(0).optional(),
        discrepancyNote: z.string().trim().min(1).max(500).optional(),
    })
    .superRefine((data, ctx) => {
        if (data.type === "receipt") {
            if (data.quantity < 0) {
                ctx.addIssue({
                    code: "custom",
                    path: ["quantity"],
                    message: "Quantity must be non-negative for a receipt",
                });
            }
            if (!data.supplierId) {
                ctx.addIssue({
                    code: "custom",
                    path: ["supplierId"],
                    message: "supplierId is required for a receipt",
                });
            }
            if (data.expectedQuantity !== undefined) {
                const hasDiscrepancy = data.quantity !== data.expectedQuantity;
                if (hasDiscrepancy && !data.discrepancyNote) {
                    ctx.addIssue({
                        code: "custom",
                        path: ["discrepancyNote"],
                        message:
                            "discrepancyNote is required when quantity differs from expectedQuantity",
                    });
                }
                if (!hasDiscrepancy && data.discrepancyNote !== undefined) {
                    ctx.addIssue({
                        code: "custom",
                        path: ["discrepancyNote"],
                        message:
                            "discrepancyNote must be absent when quantity matches expectedQuantity",
                    });
                }
            }
        } else {
            if (data.expectedQuantity !== undefined) {
                ctx.addIssue({
                    code: "custom",
                    path: ["expectedQuantity"],
                    message: "expectedQuantity is only allowed for receipts",
                });
            }
            if (data.discrepancyNote !== undefined) {
                ctx.addIssue({
                    code: "custom",
                    path: ["discrepancyNote"],
                    message: "discrepancyNote is only allowed for receipts",
                });
            }
            if (data.type === "shipment" || data.type === "write-off") {
                if (data.quantity >= 0) {
                    ctx.addIssue({
                        code: "custom",
                        path: ["quantity"],
                        message: `Quantity must be negative for a ${data.type}`,
                    });
                }
            } else if (data.type === "adjustment") {
                if (data.quantity === 0) {
                    ctx.addIssue({
                        code: "custom",
                        path: ["quantity"],
                        message: "Quantity must be non-zero",
                    });
                }
            }
        }
    });

export type Movement = z.infer<typeof MovementSchema>;
