// outsource dependencies
import type { EntityState } from "@reduxjs/toolkit";

// local dependencies
import type { Category } from "@/domain";
import type { CategoryWithCounts } from "@/api/types";
import { ROOT, type ChildrenIndex, buildChildrenIndex } from "./tree";

export type MoveTargetOption = {
    id: Category["id"] | null;
    name: string;
    depth: number;
    disabled: boolean;
    current: boolean;
};

function dfsWalk(
    index: ChildrenIndex,
    data: EntityState<CategoryWithCounts, Category["id"]>,
    result: MoveTargetOption[],
    getState: (id: Category["id"]) => { disabled: boolean; current: boolean },
): void {
    const stack: [Category["id"], number][] = [];
    const topLevelIds = index.get(ROOT) ?? [];
    for (let i = topLevelIds.length - 1; i >= 0; i--) {
        const id = topLevelIds[i];
        if (id !== undefined) stack.push([id, 1]);
    }
    let top: [Category["id"], number] | undefined;
    while ((top = stack.pop()) !== undefined) {
        const [id, depth] = top;
        const cat = data.entities[id];
        if (!cat) continue;
        const { disabled, current } = getState(id);
        result.push({ id, name: cat.name, depth, disabled, current });
        const children = index.get(id) ?? [];
        for (let i = children.length - 1; i >= 0; i--) {
            const childId = children[i];
            if (childId !== undefined) stack.push([childId, depth + 1]);
        }
    }
}

export function buildMoveTargets(
    data: EntityState<CategoryWithCounts, Category["id"]>,
    mode:
        | { kind: "category"; categoryId: Category["id"] }
        | { kind: "product"; categoryId: Category["id"] },
): MoveTargetOption[] {
    const index = buildChildrenIndex(data);
    const result: MoveTargetOption[] = [];

    if (mode.kind === "category") {
        const entity = data.entities[mode.categoryId];
        const currentParentId = entity?.parentId ?? null;

        const selfAndDescendants = new Set<Category["id"]>();
        const descStack: Category["id"][] = [mode.categoryId];
        let descItem: Category["id"] | undefined;
        while ((descItem = descStack.pop()) !== undefined) {
            selfAndDescendants.add(descItem);
            for (const child of index.get(descItem) ?? []) {
                descStack.push(child);
            }
        }

        result.push({
            id: null,
            name: "Top level",
            depth: 0,
            disabled: currentParentId === null,
            current: currentParentId === null,
        });

        dfsWalk(index, data, result, (id) => ({
            disabled: selfAndDescendants.has(id) || id === currentParentId,
            current: id === currentParentId,
        }));
    } else {
        dfsWalk(index, data, result, (id) => {
            const isCurrent = id === mode.categoryId;
            return { disabled: isCurrent, current: isCurrent };
        });
    }

    return result;
}

export function filterMoveTargets(
    options: MoveTargetOption[],
    query: string,
): MoveTargetOption[] {
    const trimmed = query.trim();
    if (!trimmed) return options;
    const lower = trimmed.toLowerCase();
    return options.filter((opt) => opt.name.toLowerCase().includes(lower));
}
