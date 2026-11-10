// outsource dependencies
import { createSelector, type EntityState } from "@reduxjs/toolkit";

// local dependencies
import type { Category } from "@/domain";
import { buildChildrenIndex } from "./tree";
import type { CategoryWithCounts } from "@/api/types";

export const selectChildrenIndex = createSelector(
    (state: EntityState<CategoryWithCounts, Category["id"]>) => state,
    buildChildrenIndex,
);
