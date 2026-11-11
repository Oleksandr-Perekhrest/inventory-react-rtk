// outsource dependencies
import { useContext, createContext } from "react";

// local dependencies
import type { Category } from "@/domain";

export type TreeSearchState = {
    query: string;
    matches: Set<Category["id"]>;
    visible: Set<Category["id"]>;
};

export const INACTIVE_SEARCH: TreeSearchState = {
    query: "",
    matches: new Set(),
    visible: new Set(),
};

export const TreeSearchContext =
    createContext<TreeSearchState>(INACTIVE_SEARCH);

export function useTreeSearch(): TreeSearchState {
    return useContext(TreeSearchContext);
}

export const TreeSelectContext = createContext<(id: string) => void>(() => {});

export function useTreeSelect(): (id: string) => void {
    return useContext(TreeSelectContext);
}

export type TreeDndEnabled = {
    canDragCategories: boolean;
    canDrop: boolean;
};

const TREE_DND_DISABLED: TreeDndEnabled = {
    canDragCategories: false,
    canDrop: false,
};

export const TreeDndEnabledContext =
    createContext<TreeDndEnabled>(TREE_DND_DISABLED);

export function useTreeDndEnabled(): TreeDndEnabled {
    return useContext(TreeDndEnabledContext);
}
