// outsource dependencies
import { type EntityState, createEntityAdapter } from "@reduxjs/toolkit";

// local dependencies
import { baseApi } from "../baseApi";
import type { MoveCategoryBody } from "../queries";
import type { CategoryWithCounts } from "../types";
import { moveCategory, type Category } from "../../domain";
import { computeTotalProductCounts } from "../categoryCounts";

export const categoriesAdapter = createEntityAdapter<
    CategoryWithCounts,
    Category["id"]
>({ selectId: (c) => c.id });

const getExtendedApi = baseApi.injectEndpoints({
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

const extendedApi = getExtendedApi.injectEndpoints({
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
                    getExtendedApi.util.updateQueryData(
                        "getCategories",
                        undefined,
                        (draft) => {
                            const entities = Object.values(
                                draft.entities,
                            ).filter(
                                (e): e is CategoryWithCounts => e !== undefined,
                            );
                            const result = moveCategory(entities, {
                                id,
                                parentId,
                                index,
                            });
                            if (!result.ok) return;
                            categoriesAdapter.updateMany(
                                draft,
                                result.changes.map(
                                    ({
                                        id: changeId,
                                        parentId: changeParentId,
                                        position,
                                    }) => ({
                                        id: changeId,
                                        changes: {
                                            parentId: changeParentId,
                                            position,
                                        },
                                    }),
                                ),
                            );
                            const updatedEntities = Object.values(
                                draft.entities,
                            ).filter(
                                (e): e is CategoryWithCounts => e !== undefined,
                            );
                            const totals =
                                computeTotalProductCounts(updatedEntities);
                            const totalUpdates = updatedEntities
                                .filter(
                                    (e) =>
                                        totals.get(e.id) !==
                                        e.totalProductCount,
                                )
                                .map((e) => ({
                                    id: e.id,
                                    changes: {
                                        totalProductCount:
                                            totals.get(e.id) ??
                                            e.totalProductCount,
                                    },
                                }));
                            if (totalUpdates.length > 0) {
                                categoriesAdapter.updateMany(
                                    draft,
                                    totalUpdates,
                                );
                            }
                        },
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
