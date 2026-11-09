// local dependencies
import type { Db } from "../../db";
import type { CategoryWithCounts } from "../../../api/types";
import { buildChildrenMap, collectDescendantIds } from "../tree";

export function listCategories({ db }: { db: Db }): {
    body: CategoryWithCounts[];
} {
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

    const rows: CategoryWithCounts[] = sorted.map((cat) => {
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
