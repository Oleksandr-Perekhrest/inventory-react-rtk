// outsource dependencies
import * as z from "zod";

export const CategorySchema = z.object({
    id: z.string().min(1),
    name: z.string().trim().min(1),
    parentId: z.string().nullable(),
    position: z.int().gte(0),
});

export type Category = z.infer<typeof CategorySchema>;
