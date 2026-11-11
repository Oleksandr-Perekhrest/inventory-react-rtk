// local dependencies
import type { Paginated } from "../types";
import type { Product, Category } from "../../domain";
import { baseApi, serializeParams } from "../baseApi";
import { matchesCategoryFilter } from "../productSelection";
import type { ProductsParams, UpdateProductBody } from "../queries";
import { categoriesApi, adjustProductCountsInCache } from "./categories";

const productsQueryApi = baseApi.injectEndpoints({
    endpoints: (build) => ({
        getProducts: build.query<Paginated<Product>, ProductsParams>({
            query: (params) => ({
                url: "/products",
                params: serializeParams(params as Record<string, unknown>),
            }),
            providesTags: (result) => [
                { type: "Product" as const, id: "LIST" },
                ...(result?.items ?? []).map((p) => ({
                    type: "Product" as const,
                    id: p.id,
                })),
            ],
        }),
        getProduct: build.query<Product, string>({
            query: (id) => `/products/${id}`,
            providesTags: (_, __, id) => [{ type: "Product" as const, id }],
        }),
    }),
});

// State type that both RootState and RTK Query's onQueryStarted getState() satisfy
type ApiState = { api: ReturnType<typeof baseApi.reducer> };

function findCachedCategoryId(
    state: ApiState,
    id: Product["id"],
): Category["id"] | undefined {
    const cachedArgs = productsQueryApi.util.selectCachedArgsForQuery(
        state,
        "getProducts",
    );
    for (const args of cachedArgs) {
        const found = productsQueryApi.endpoints.getProducts
            .select(args)(state)
            .data?.items.find((p) => p.id === id);
        if (found !== undefined) return found.categoryId;
    }
    return undefined;
}

function applyCategoryChangeToList(
    draft: Paginated<Product>,
    change: {
        id: Product["id"];
        categoryId: Category["id"];
        stays: boolean;
    },
): void {
    const idx = draft.items.findIndex((p) => p.id === change.id);
    if (idx === -1) return;
    const item = draft.items[idx];
    if (item === undefined) return;
    if (change.stays) {
        item.categoryId = change.categoryId;
    } else {
        draft.items.splice(idx, 1);
        draft.total = Math.max(0, draft.total - 1);
    }
}

const extendedApi = productsQueryApi.injectEndpoints({
    endpoints: (build) => ({
        updateProduct: build.mutation<
            Product,
            { id: Product["id"] } & UpdateProductBody
        >({
            query: ({ id, categoryId }) => ({
                url: `/products/${id}`,
                method: "PATCH",
                body: { categoryId },
            }),
            onQueryStarted: async (
                { id, categoryId },
                { dispatch, getState, queryFulfilled },
            ) => {
                const state = getState();
                const fromCategoryId = findCachedCategoryId(state, id);
                if (
                    fromCategoryId === undefined ||
                    fromCategoryId === categoryId
                ) {
                    await queryFulfilled;
                    return;
                }

                const categories =
                    categoriesApi.endpoints.getCategories.select()(state).data;
                const cachedArgs =
                    productsQueryApi.util.selectCachedArgsForQuery(
                        state,
                        "getProducts",
                    );
                const patches: Array<{ undo: () => void }> = [];

                patches.push(
                    dispatch(
                        categoriesApi.util.updateQueryData(
                            "getCategories",
                            undefined,
                            (draft) =>
                                adjustProductCountsInCache(draft, {
                                    fromCategoryId,
                                    toCategoryId: categoryId,
                                }),
                        ),
                    ),
                );

                for (const args of cachedArgs) {
                    // categories absent: assume stays=true; invalidation refetches the rare mismatch
                    const stays =
                        categories === undefined
                            ? true
                            : matchesCategoryFilter(
                                  categoryId,
                                  args,
                                  categories,
                              );
                    patches.push(
                        dispatch(
                            productsQueryApi.util.updateQueryData(
                                "getProducts",
                                args,
                                (draft) =>
                                    applyCategoryChangeToList(draft, {
                                        id,
                                        categoryId,
                                        stays,
                                    }),
                            ),
                        ),
                    );
                }

                patches.push(
                    dispatch(
                        productsQueryApi.util.updateQueryData(
                            "getProduct",
                            id,
                            (draft) => {
                                draft.categoryId = categoryId;
                            },
                        ),
                    ),
                );

                try {
                    await queryFulfilled;
                } catch {
                    for (const patch of patches) patch.undo();
                }
            },
            invalidatesTags: (_result, _error, { id }) => [
                { type: "Product", id },
                { type: "Product", id: "LIST" },
                { type: "Category", id: "LIST" },
            ],
        }),
    }),
});

export const productsApi = extendedApi;
export const {
    useGetProductsQuery,
    useGetProductQuery,
    useUpdateProductMutation,
} = extendedApi;
