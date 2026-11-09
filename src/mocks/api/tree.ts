// local dependencies
import type { Category } from "../../domain";

export function buildChildrenMap(
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

export function collectDescendantIds(
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
