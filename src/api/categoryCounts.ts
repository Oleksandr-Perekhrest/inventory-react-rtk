// local dependencies
import type { CategoryWithCounts } from "./types";

export function computeTotalProductCounts(
    categories: ReadonlyArray<
        Pick<CategoryWithCounts, "id" | "parentId" | "productCount">
    >,
): Map<CategoryWithCounts["id"], number> {
    const idsInList = new Set(categories.map((c) => c.id));
    const childrenMap = new Map<string, string[]>();

    for (const cat of categories) {
        childrenMap.set(cat.id, []);
    }
    for (const cat of categories) {
        if (cat.parentId !== null && idsInList.has(cat.parentId)) {
            const children = childrenMap.get(cat.parentId);
            if (children !== undefined) {
                children.push(cat.id);
            }
        }
    }

    const roots: string[] = [];
    for (const cat of categories) {
        if (cat.parentId === null || !idsInList.has(cat.parentId)) {
            roots.push(cat.id);
        }
    }

    const queue: string[] = [...roots];
    const order: string[] = [];
    let queueHead = 0;
    while (queueHead < queue.length) {
        const id = queue[queueHead];
        queueHead += 1;
        order.push(id);
        for (const child of childrenMap.get(id) ?? []) {
            queue.push(child);
        }
    }

    const ownCount = new Map<string, number>();
    for (const cat of categories) {
        ownCount.set(cat.id, cat.productCount);
    }

    const totals = new Map<string, number>();
    for (const id of [...order].reverse()) {
        let total = ownCount.get(id) ?? 0;
        for (const child of childrenMap.get(id) ?? []) {
            total += totals.get(child) ?? 0;
        }
        totals.set(id, total);
    }

    return totals;
}
