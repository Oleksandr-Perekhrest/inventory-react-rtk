// local dependencies
import type { Category } from "./category";

export type CategoryPlacement = Pick<Category, "id" | "parentId" | "position">;
export type MoveCategoryInput = {
    id: Category["id"];
    parentId: Category["parentId"];
    index: number;
};
export type MoveCategoryFailure =
    | "CATEGORY_NOT_FOUND"
    | "PARENT_NOT_FOUND"
    | "INTO_SELF_OR_DESCENDANT"
    | "INDEX_OUT_OF_RANGE";
export type MoveCategoryResult =
    | { ok: true; changes: CategoryPlacement[] }
    | { ok: false; reason: MoveCategoryFailure };

/**
 * `index` is the insertion position among the new siblings after the moved
 * category has been removed from its old parent. Valid range: integer 0..newSiblings.length.
 */
export function moveCategory<T extends CategoryPlacement>(
    categories: ReadonlyArray<Readonly<T>>,
    input: MoveCategoryInput,
): MoveCategoryResult {
    const moving = categories.find((c) => c.id === input.id);
    if (moving === undefined) {
        return { ok: false, reason: "CATEGORY_NOT_FOUND" };
    }

    if (
        input.parentId !== null &&
        !categories.some((c) => c.id === input.parentId)
    ) {
        return { ok: false, reason: "PARENT_NOT_FOUND" };
    }

    const childrenMap = new Map<string, string[]>();
    for (const cat of categories) {
        if (cat.parentId !== null) {
            const list = childrenMap.get(cat.parentId);
            if (list !== undefined) {
                list.push(cat.id);
            } else {
                childrenMap.set(cat.parentId, [cat.id]);
            }
        }
    }

    const toVisit = [...(childrenMap.get(moving.id) ?? [])];
    const descendants = new Set<string>();
    while (toVisit.length > 0) {
        const current = toVisit.pop();
        if (current === undefined) break;
        descendants.add(current);
        for (const child of childrenMap.get(current) ?? []) {
            toVisit.push(child);
        }
    }

    if (
        input.parentId === moving.id ||
        (input.parentId !== null && descendants.has(input.parentId))
    ) {
        return { ok: false, reason: "INTO_SELF_OR_DESCENDANT" };
    }

    const bySiblingOrder = (
        a: CategoryPlacement,
        b: CategoryPlacement,
    ): number => a.position - b.position || a.id.localeCompare(b.id);

    const newSiblings = categories
        .filter((c) => c.parentId === input.parentId && c.id !== moving.id)
        .sort(bySiblingOrder);

    if (
        !Number.isInteger(input.index) ||
        input.index < 0 ||
        input.index > newSiblings.length
    ) {
        return { ok: false, reason: "INDEX_OUT_OF_RANGE" };
    }

    const isNewParentSame = moving.parentId === input.parentId;

    const finalNewList = [
        ...newSiblings.slice(0, input.index),
        moving,
        ...newSiblings.slice(input.index),
    ];

    const changes: CategoryPlacement[] = [];

    finalNewList.forEach((cat, i) => {
        if (cat.parentId !== input.parentId || cat.position !== i) {
            changes.push({ id: cat.id, parentId: input.parentId, position: i });
        }
    });

    if (!isNewParentSame) {
        categories
            .filter((c) => c.parentId === moving.parentId && c.id !== moving.id)
            .sort(bySiblingOrder)
            .forEach((cat, i) => {
                if (cat.position !== i) {
                    changes.push({
                        id: cat.id,
                        parentId: cat.parentId,
                        position: i,
                    });
                }
            });
    }

    return { ok: true, changes };
}
