// outsource dependencies
import { useContext, createContext } from "react";

// local dependencies
import type { Category } from "../../domain";

export type TreeSearchState = {
    query: string;
    matches: Set<Category["id"]>;
    visible: Set<Category["id"]>;
    onSelect: (id: Category["id"]) => void;
};

export const INACTIVE_SEARCH: TreeSearchState = {
    query: "",
    matches: new Set(),
    visible: new Set(),
    onSelect: () => {},
};

export const TreeSearchContext =
    createContext<TreeSearchState>(INACTIVE_SEARCH);

export function useTreeSearch(): TreeSearchState {
    return useContext(TreeSearchContext);
}
