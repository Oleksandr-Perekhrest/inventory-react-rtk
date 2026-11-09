// outsource dependencies
import { type EntityState, createEntityAdapter } from "@reduxjs/toolkit";

// local dependencies
import { baseApi } from "../baseApi";
import type { Category } from "../../domain";
import type { CategoryWithCounts } from "../types";

export const categoriesAdapter = createEntityAdapter<
    CategoryWithCounts,
    Category["id"]
>({ selectId: (c) => c.id });

const extendedApi = baseApi.injectEndpoints({
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

export const { useGetCategoriesQuery } = extendedApi;
