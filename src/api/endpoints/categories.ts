// local dependencies
import { baseApi } from "../baseApi";
import type { CategoryWithCounts } from "../types";

const extendedApi = baseApi.injectEndpoints({
    endpoints: (build) => ({
        getCategories: build.query<CategoryWithCounts[], void>({
            query: () => "/categories",
            providesTags: (result) => [
                { type: "Category" as const, id: "LIST" },
                ...(result ?? []).map((c) => ({
                    type: "Category" as const,
                    id: c.id,
                })),
            ],
        }),
    }),
});

export const { useGetCategoriesQuery } = extendedApi;
