// outsource dependencies
import type { EntityState } from "@reduxjs/toolkit";

// local dependencies
import type { Category } from "@/domain";
import type { CategoryWithCounts } from "@/api/types";

export const ROOT = "ROOT" as const;

export type ParentKey = Category["id"] | typeof ROOT;
export type ChildrenIndex = Map<ParentKey, Category["id"][]>;

export function buildChildrenIndex(
    state: EntityState<CategoryWithCounts, Category["id"]>,
): ChildrenIndex {
    const index: ChildrenIndex = new Map();
    for (const id of state.ids) {
        const entity = state.entities[id];
        if (!entity) continue;
        const parentKey: ParentKey = entity.parentId ?? ROOT;
        const siblings = index.get(parentKey);
        if (siblings) {
            siblings.push(id);
        } else {
            index.set(parentKey, [id]);
        }
    }
    for (const siblings of index.values()) {
        siblings.sort(
            (a, b) =>
                (state.entities[a]?.position ?? 0) -
                (state.entities[b]?.position ?? 0),
        );
    }
    return index;
}

export function findMatches(
    state: EntityState<CategoryWithCounts, Category["id"]>,
    query: string,
): Set<Category["id"]> {
    const trimmed = query.trim();
    if (!trimmed) return new Set();
    const lower = trimmed.toLowerCase();
    const matches = new Set<Category["id"]>();
    for (const id of state.ids) {
        const entity = state.entities[id];
        if (entity && entity.name.toLowerCase().includes(lower)) {
            matches.add(id);
        }
    }
    return matches;
}

export function collectAncestors(
    state: EntityState<CategoryWithCounts, Category["id"]>,
    ids: Set<Category["id"]>,
): Set<Category["id"]> {
    const ancestors = new Set<Category["id"]>();
    const visited = new Set<Category["id"]>();
    for (const id of ids) {
        let current = state.entities[id];
        while (current?.parentId) {
            if (visited.has(current.parentId)) break;
            visited.add(current.parentId);
            ancestors.add(current.parentId);
            current = state.entities[current.parentId];
        }
    }
    return ancestors;
}

export type VisibleNode = {
    id: Category["id"];
    parentId: ParentKey;
    level: number;
    hasChildren: boolean;
    expanded: boolean;
};

export function getVisibleOrder(
    index: ChildrenIndex,
    isExpanded: (id: Category["id"]) => boolean,
    visible?: Set<Category["id"]>,
): VisibleNode[] {
    const result: VisibleNode[] = [];

    function walk(parentId: ParentKey, level: number) {
        const children = index.get(parentId) ?? [];
        for (const id of children) {
            if (visible && !visible.has(id)) continue;
            const rawChildren = index.get(id) ?? [];
            const visibleChildren = visible
                ? rawChildren.filter((c) => visible.has(c))
                : rawChildren;
            const hasChildren = visibleChildren.length > 0;
            const expanded = visible ? hasChildren : isExpanded(id);
            result.push({ id, parentId, level, hasChildren, expanded });
            if (expanded) {
                walk(id, level + 1);
            }
        }
    }

    walk(ROOT, 1);
    return result;
}

export type Segment = { text: string; match: boolean };

export function splitByMatch(text: string, query: string): Segment[] {
    const trimmed = query.trim();
    if (!trimmed) return [{ text, match: false }];
    const segments: Segment[] = [];
    const lower = text.toLowerCase();
    const lowerQuery = trimmed.toLowerCase();
    let pos = 0;
    while (pos < text.length) {
        const idx = lower.indexOf(lowerQuery, pos);
        if (idx === -1) {
            segments.push({ text: text.slice(pos), match: false });
            break;
        }
        if (idx > pos) {
            segments.push({ text: text.slice(pos, idx), match: false });
        }
        segments.push({
            text: text.slice(idx, idx + trimmed.length),
            match: true,
        });
        pos = idx + trimmed.length;
    }
    return segments;
}
