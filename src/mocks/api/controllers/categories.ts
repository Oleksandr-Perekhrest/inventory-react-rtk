// outsource dependencies
import * as z from "zod";

// local dependencies
import type { Db } from "../../db";
import type { Category } from "../../../domain";

function buildChildrenMap(
    categories: ReadonlyArray<Readonly<Category>>,
): Map<string, string[]> {
    const map = new Map<string, string[]>();
    for (const cat of categories) {
        if (cat.parentId !== null) {
            if (!map.has(cat.parentId)) map.set(cat.parentId, []);
            map.get(cat.parentId)!.push(cat.id);
        }
    }
    return map;
}

function collectDescendantIds(
    id: string,
    childrenMap: Map<string, string[]>,
): Set<string> {
    const result = new Set<string>([id]);
    const queue = [id];
    while (queue.length > 0) {
        const current = queue.shift()!;
        for (const childId of childrenMap.get(current) ?? []) {
            result.add(childId);
            queue.push(childId);
        }
    }
    return result;
}

export const categoriesQuerySchema = z.object({});

export function listCategories({ db }: { db: Db }) {
    const { categories, products } = db;
    const childrenMap = buildChildrenMap(categories);

    const directCount = new Map<string, number>();
    for (const p of products) {
        directCount.set(p.categoryId, (directCount.get(p.categoryId) ?? 0) + 1);
    }

    const sorted = [...categories].sort((a, b) => {
        if (a.parentId === null && b.parentId !== null) return -1;
        if (a.parentId !== null && b.parentId === null) return 1;
        if (a.parentId !== b.parentId) {
            return a.parentId!.localeCompare(b.parentId!);
        }
        return a.position - b.position;
    });

    const rows = sorted.map((cat) => {
        const descendants = collectDescendantIds(cat.id, childrenMap);
        let totalProductCount = 0;
        for (const p of products) {
            if (descendants.has(p.categoryId)) totalProductCount++;
        }
        return {
            ...cat,
            productCount: directCount.get(cat.id) ?? 0,
            totalProductCount,
        };
    });

    return { body: rows };
}
