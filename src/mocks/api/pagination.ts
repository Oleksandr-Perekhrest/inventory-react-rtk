// outsource dependencies
import * as z from "zod";

// local dependencies
import type { Paginated } from "../../api/types";

export type { Paginated };

export const paginationQuery = {
    page: z.coerce.number().int().gte(1).default(1),
    pageSize: z.coerce.number().int().gte(1).lte(100).default(20),
};

export function paginate<T>(
    items: T[],
    page: number,
    pageSize: number,
): Paginated<T> {
    const total = items.length;
    const start = (page - 1) * pageSize;
    return {
        items: items.slice(start, start + pageSize),
        total,
        page,
        pageSize,
    };
}
