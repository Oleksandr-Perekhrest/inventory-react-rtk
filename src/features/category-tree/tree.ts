// outsource dependencies
import type { EntityState } from "@reduxjs/toolkit";

// local dependencies
import type { Category } from "../../domain";
import type { CategoryWithCounts } from "../../api/types";

export const ROOT = "ROOT";

export function buildChildrenIndex(
    state: EntityState<CategoryWithCounts, Category["id"]>,
): Map<string, Category["id"][]> {
    const index = new Map<string, Category["id"][]>();
    for (const id of state.ids) {
        const entity = state.entities[id];
        if (!entity) continue;
        const parentKey = entity.parentId ?? ROOT;
        const siblings = index.get(parentKey);
        if (siblings) {
            siblings.push(id);
        } else {
            index.set(parentKey, [id]);
        }
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
