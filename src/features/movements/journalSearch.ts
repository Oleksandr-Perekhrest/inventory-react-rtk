// outsource dependencies
import * as z from "zod";

// local dependencies
import { MovementTypeSchema } from "@/domain";
import type { MovementsParams } from "@/api/queries";

export const JOURNAL_SEARCH_DEFAULTS = {
    order: "desc",
    page: 1,
    pageSize: 20,
} as const;

export const journalSearchSchema = z
    .object({
        from: z.iso.date().optional().catch(undefined),
        to: z.iso.date().optional().catch(undefined),
        type: MovementTypeSchema.optional().catch(undefined),
        productId: z.string().min(1).optional().catch(undefined),
        order: z
            .enum(["asc", "desc"])
            .default(JOURNAL_SEARCH_DEFAULTS.order)
            .catch(JOURNAL_SEARCH_DEFAULTS.order),
        page: z.coerce
            .number()
            .int()
            .min(1)
            .default(JOURNAL_SEARCH_DEFAULTS.page)
            .catch(JOURNAL_SEARCH_DEFAULTS.page),
        pageSize: z.coerce
            .number()
            .int()
            .min(1)
            .max(100)
            .default(JOURNAL_SEARCH_DEFAULTS.pageSize)
            .catch(JOURNAL_SEARCH_DEFAULTS.pageSize),
    })
    .transform((data) => {
        // Drop "to" when from > to — the API would answer 400.
        if (
            data.from !== undefined &&
            data.to !== undefined &&
            data.from > data.to
        ) {
            return { ...data, to: undefined };
        }
        return data;
    });

export type JournalSearch = z.output<typeof journalSearchSchema>;

export function toMovementsParams(search: JournalSearch): MovementsParams {
    return { ...search };
}

export function hasActiveFilters(search: JournalSearch): boolean {
    return (
        search.from !== undefined ||
        search.to !== undefined ||
        search.type !== undefined ||
        search.productId !== undefined
    );
}
