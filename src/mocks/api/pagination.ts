// local dependencies
import type { Paginated } from "../../api/types";

export type { Paginated };

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
