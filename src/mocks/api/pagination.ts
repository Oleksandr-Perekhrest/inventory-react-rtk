// outsource dependencies
import * as z from "zod";

export const paginationQuery = {
    page: z.coerce.number().int().gte(1).default(1),
    pageSize: z.coerce.number().int().gte(1).lte(100).default(20),
};

export type PaginatedResult<T> = {
    items: T[];
    total: number;
    page: number;
    pageSize: number;
};

export function paginate<T>(
    items: T[],
    page: number,
    pageSize: number,
): PaginatedResult<T> {
    const total = items.length;
    const start = (page - 1) * pageSize;
    return {
        items: items.slice(start, start + pageSize),
        total,
        page,
        pageSize,
    };
}
