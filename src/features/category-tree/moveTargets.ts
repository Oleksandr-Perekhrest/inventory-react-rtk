// outsource dependencies
import type { EntityState } from "@reduxjs/toolkit";

// local dependencies
import type { Category } from "@/domain";
import { ROOT, buildChildrenIndex } from "./tree";
import type { CategoryWithCounts } from "@/api/types";

export type MoveTargetOption = {
    id: Category["id"] | null;
    name: string;
    depth: number;
    disabled: boolean;
    current: boolean;
};

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

        const dfsStack: [Category["id"], number][] = [];
        const topLevelIds = index.get(ROOT) ?? [];
        for (let i = topLevelIds.length - 1; i >= 0; i--) {
            const id = topLevelIds[i];
            if (id !== undefined) dfsStack.push([id, 1]);
        }

        let top: [Category["id"], number] | undefined;
        while ((top = dfsStack.pop()) !== undefined) {
            const [id, depth] = top;
            const cat = data.entities[id];
            if (!cat) continue;

            const disabled =
                selfAndDescendants.has(id) || id === currentParentId;
            result.push({
                id,
                name: cat.name,
                depth,
                disabled,
                current: id === currentParentId,
            });

            const children = index.get(id) ?? [];
            for (let i = children.length - 1; i >= 0; i--) {
                const childId = children[i];
                if (childId !== undefined) dfsStack.push([childId, depth + 1]);
            }
        }
    } else {
        const dfsStack: [Category["id"], number][] = [];
        const topLevelIds = index.get(ROOT) ?? [];
        for (let i = topLevelIds.length - 1; i >= 0; i--) {
            const id = topLevelIds[i];
            if (id !== undefined) dfsStack.push([id, 1]);
        }

        let top: [Category["id"], number] | undefined;
        while ((top = dfsStack.pop()) !== undefined) {
            const [id, depth] = top;
            const cat = data.entities[id];
            if (!cat) continue;

            const isCurrent = id === mode.categoryId;
            result.push({
                id,
                name: cat.name,
                depth,
                disabled: isCurrent,
                current: isCurrent,
            });

            const children = index.get(id) ?? [];
            for (let i = children.length - 1; i >= 0; i--) {
                const childId = children[i];
                if (childId !== undefined) dfsStack.push([childId, depth + 1]);
            }
        }
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
