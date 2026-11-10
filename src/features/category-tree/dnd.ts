// outsource dependencies
import type { EntityState } from "@reduxjs/toolkit";

// local dependencies
import type { Category } from "@/domain";
import { ROOT, buildChildrenIndex } from "./tree";
import type { CategoryWithCounts } from "@/api/types";
import { moveCategory, type MoveCategoryInput } from "@/domain/category-move";

export type DropZone = "before" | "inside" | "after";

export type CategoryDndData = { categoryId: Category["id"] };

export function toCategoryDraggableId(categoryId: Category["id"]): string {
    return `category:${categoryId}`;
}

export function toCategoryDroppableId(categoryId: Category["id"]): string {
    return `category-drop:${categoryId}`;
}

export function isCategoryDndData(data: unknown): data is CategoryDndData {
    return (
        typeof data === "object" &&
        data !== null &&
        "categoryId" in data &&
        typeof data.categoryId === "string"
    );
}

export function getDropZone(
    pointerY: number,
    rect: { top: number; height: number },
): DropZone {
    if (pointerY <= rect.top) return "before";
    if (pointerY >= rect.top + rect.height) return "after";
    const relative = pointerY - rect.top;
    const third = rect.height / 3;
    if (relative < third) return "before";
    if (relative > third * 2) return "after";
    return "inside";
}

export function resolveCategoryDrop(
    data: EntityState<CategoryWithCounts, Category["id"]>,
    drop: {
        draggedId: Category["id"];
        targetId: Category["id"];
        zone: DropZone;
        targetExpanded: boolean;
    },
): MoveCategoryInput | null {
    if (drop.draggedId === drop.targetId) return null;

    const target = data.entities[drop.targetId];
    if (!target) return null;

    const childrenIndex = buildChildrenIndex(data);

    const targetParentKey = target.parentId ?? ROOT;
    const targetSiblings = (childrenIndex.get(targetParentKey) ?? []).filter(
        (id) => id !== drop.draggedId,
    );
    const targetPos = targetSiblings.indexOf(drop.targetId);
    if (targetPos === -1) return null;

    const targetChildren = (childrenIndex.get(drop.targetId) ?? []).filter(
        (id) => id !== drop.draggedId,
    );

    let input: MoveCategoryInput;

    if (drop.zone === "before") {
        input = {
            id: drop.draggedId,
            parentId: target.parentId,
            index: targetPos,
        };
    } else if (drop.zone === "after") {
        if (drop.targetExpanded && targetChildren.length > 0) {
            input = { id: drop.draggedId, parentId: drop.targetId, index: 0 };
        } else {
            input = {
                id: drop.draggedId,
                parentId: target.parentId,
                index: targetPos + 1,
            };
        }
    } else {
        input = {
            id: drop.draggedId,
            parentId: drop.targetId,
            index: targetChildren.length,
        };
    }

    const categories = Object.values(data.entities).filter(
        (c): c is CategoryWithCounts => c !== undefined,
    );
    const result = moveCategory(categories, input);
    if (!result.ok || result.changes.length === 0) return null;

    return input;
}
