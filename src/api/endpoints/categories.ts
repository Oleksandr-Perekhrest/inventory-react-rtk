// outsource dependencies
import { type EntityState, createEntityAdapter } from "@reduxjs/toolkit";

// local dependencies
import { baseApi } from "../baseApi";
import type { MoveCategoryBody } from "../queries";
import type { CategoryWithCounts } from "../types";
import { computeTotalProductCounts } from "../categoryCounts";
import {
    moveCategory,
    type Category,
    type MoveCategoryInput,
} from "../../domain";

export const categoriesAdapter = createEntityAdapter<
    CategoryWithCounts,
    Category["id"]
>({ selectId: (c) => c.id });

const categoriesQueryApi = baseApi.injectEndpoints({
    endpoints: (build) => ({
        getCategories: build.query<
            EntityState<CategoryWithCounts, Category["id"]>,
            void
        >({
            query: () => "/categories",
            transformResponse: (response: CategoryWithCounts[]) =>
                categoriesAdapter.setAll(
                    categoriesAdapter.getInitialState(),
                    response,
                ),
            providesTags: (result) => [
                { type: "Category" as const, id: "LIST" },
                ...(result?.ids ?? []).map((id) => ({
                    type: "Category" as const,
                    id,
                })),
            ],
        }),
    }),
});

export function recomputeTotalsInCache(
    draft: EntityState<CategoryWithCounts, Category["id"]>,
): void {
    const entities = Object.values(draft.entities).filter(
        (e): e is CategoryWithCounts => e !== undefined,
    );
    const totals = computeTotalProductCounts(entities);
    const updates = entities
        .filter((e) => totals.get(e.id) !== e.totalProductCount)
        .map((e) => ({
            id: e.id,
            changes: {
                totalProductCount: totals.get(e.id) ?? e.totalProductCount,
            },
        }));
    if (updates.length > 0) {
        categoriesAdapter.updateMany(draft, updates);
    }
}

export function adjustProductCountsInCache(
    draft: EntityState<CategoryWithCounts, Category["id"]>,
    {
        fromCategoryId,
        toCategoryId,
    }: { fromCategoryId: string; toCategoryId: string },
): void {
    const from = draft.entities[fromCategoryId];
    if (from !== undefined) {
        categoriesAdapter.updateOne(draft, {
            id: fromCategoryId,
            changes: { productCount: Math.max(0, from.productCount - 1) },
        });
    }
    const to = draft.entities[toCategoryId];
    if (to !== undefined) {
        categoriesAdapter.updateOne(draft, {
            id: toCategoryId,
            changes: { productCount: to.productCount + 1 },
        });
    }
    recomputeTotalsInCache(draft);
}

function applyCategoryMoveToCache(
    draft: EntityState<CategoryWithCounts, Category["id"]>,
    input: MoveCategoryInput,
): void {
    const definedEntities = (): CategoryWithCounts[] =>
        Object.values(draft.entities).filter(
            (e): e is CategoryWithCounts => e !== undefined,
        );

    const result = moveCategory(definedEntities(), input);
    if (!result.ok) return;

    categoriesAdapter.updateMany(
        draft,
        result.changes.map((c) => ({
            id: c.id,
            changes: { parentId: c.parentId, position: c.position },
        })),
    );

    recomputeTotalsInCache(draft);
}

const extendedApi = categoriesQueryApi.injectEndpoints({
    endpoints: (build) => ({
        moveCategory: build.mutation<
            void,
            { id: Category["id"] } & MoveCategoryBody
        >({
            query: ({ id, parentId, index }) => ({
                url: `/categories/${id}/move`,
                method: "POST",
                body: { parentId, index },
            }),
            onQueryStarted: async (
                { id, parentId, index },
                { dispatch, queryFulfilled },
            ) => {
                const patch = dispatch(
                    categoriesQueryApi.util.updateQueryData(
                        "getCategories",
                        undefined,
                        (draft) =>
                            applyCategoryMoveToCache(draft, {
                                id,
                                parentId,
                                index,
                            }),
                    ),
                );
                try {
                    await queryFulfilled;
                } catch {
                    patch.undo();
                }
            },
            invalidatesTags: [
                { type: "Category", id: "LIST" },
                { type: "Product", id: "LIST" },
            ],
        }),
    }),
});

export const categoriesApi = extendedApi;
export const { useGetCategoriesQuery, useMoveCategoryMutation } = extendedApi;
