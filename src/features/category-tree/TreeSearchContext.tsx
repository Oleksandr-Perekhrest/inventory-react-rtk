// outsource dependencies
import { useContext, createContext } from "react";

// local dependencies
import type { Category } from "../../domain";

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
