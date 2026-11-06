// outsource dependencies
import { z } from "zod";

export const SupplierSchema = z.object({
    id: z.string().min(1),
    name: z.string().trim().min(1),
    email: z.email().optional(),
    phone: z.string().optional(),
});

export type Supplier = z.infer<typeof SupplierSchema>;
