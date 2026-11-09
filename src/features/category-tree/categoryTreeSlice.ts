// outsource dependencies
import { createSlice, type PayloadAction } from "@reduxjs/toolkit";

// local dependencies
import type { Category } from "../../domain";

type CategoryId = Category["id"];

type CategoryTreeState = {
    expanded: Record<CategoryId, true>;
    focusedId: CategoryId | null;
};

const initialState: CategoryTreeState = {
    expanded: {},
    focusedId: null,
};

export const categoryTreeSlice = createSlice({
    name: "categoryTree",
    initialState,
    reducers: {
        toggle(state, action: PayloadAction<CategoryId>) {
            const id = action.payload;
            if (id in state.expanded) {
                delete state.expanded[id];
            } else {
                state.expanded[id] = true;
            }
        },
        expandMany(state, action: PayloadAction<CategoryId[]>) {
            for (const id of action.payload) {
                state.expanded[id] = true;
            }
        },
        collapseAll(state) {
            state.expanded = {};
        },
        setFocused(state, action: PayloadAction<CategoryId | null>) {
            state.focusedId = action.payload;
        },
    },
});

export const { toggle, expandMany, collapseAll, setFocused } =
    categoryTreeSlice.actions;

export const selectIsExpanded = (
    state: { categoryTree: CategoryTreeState },
    id: CategoryId,
): boolean => id in state.categoryTree.expanded;

export const selectFocusedId = (state: {
    categoryTree: CategoryTreeState;
}): CategoryId | null => state.categoryTree.focusedId;

export const selectIsFocused = (
    state: { categoryTree: CategoryTreeState },
    id: CategoryId,
): boolean => state.categoryTree.focusedId === id;
