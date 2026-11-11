// outsource dependencies
import type { EntityState } from "@reduxjs/toolkit";

// local dependencies
import type { Category } from "../domain";
import type { ProductsParams } from "./queries";
import type { CategoryWithCounts } from "./types";

export function isCategoryWithin(
    categories: EntityState<CategoryWithCounts, Category["id"]>,
    categoryId: Category["id"],
    ancestorId: Category["id"],
): boolean {
    const visited = new Set<string>();
    let current: string | null = categoryId;
    while (current !== null) {
        if (visited.has(current)) return false;
        if (current === ancestorId) return true;
        visited.add(current);
        const entity: CategoryWithCounts | undefined =
            categories.entities[current];
        if (entity === undefined) return false;
        current = entity.parentId;
    }
    return false;
}

export function matchesCategoryFilter(
    categoryId: Category["id"],
    params: ProductsParams,
    categories: EntityState<CategoryWithCounts, Category["id"]>,
): boolean {
    if (params.categoryId === undefined) return true;
    const includeDescendants = params.includeDescendants ?? true;
    if (includeDescendants) {
        return isCategoryWithin(categories, categoryId, params.categoryId);
    }
    return categoryId === params.categoryId;
}
