// outsource dependencies
import { z } from "zod";

export const MovementTypeSchema = z.enum([
    "receipt",
    "shipment",
    "write-off",
    "adjustment",
]);
export type MovementType = z.infer<typeof MovementTypeSchema>;

export const MovementSchema = z.object({
    id: z.string().min(1),
    type: MovementTypeSchema,
    productId: z.string().min(1),
    quantity: z.number().refine((v) => v !== 0, "Quantity must be non-zero"),
    date: z.iso.datetime(),
    reference: z.string().min(1),
    supplierId: z.string().optional(),
    batch: z.string().optional(),
    expiresAt: z.iso.date().optional(),
    comment: z.string().optional(),
});

export type Movement = z.infer<typeof MovementSchema>;
