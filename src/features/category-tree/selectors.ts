// outsource dependencies
import { createSelector, type EntityState } from "@reduxjs/toolkit";

// local dependencies
import { buildChildrenIndex } from "./tree";
import type { Category } from "../../domain";
import type { CategoryWithCounts } from "../../api/types";

export const selectChildrenIndex = createSelector(
    (state: EntityState<CategoryWithCounts, Category["id"]>) => state,
    buildChildrenIndex,
);
