// local dependencies
import type { Paginated } from "../types";
import type { Product } from "../../domain";
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
                const categories =
                    categoriesApi.endpoints.getCategories.select()(state).data;
                const cachedArgs =
                    productsQueryApi.util.selectCachedArgsForQuery(
                        state,
                        "getProducts",
                    );

                let fromCategoryId: string | undefined;
                for (const args of cachedArgs) {
                    const cached =
                        productsQueryApi.endpoints.getProducts.select(args)(
                            state,
                        ).data;
                    const found = cached?.items.find((p) => p.id === id);
                    if (found !== undefined) {
                        fromCategoryId = found.categoryId;
                        break;
                    }
                }

                if (
                    fromCategoryId === undefined ||
                    fromCategoryId === categoryId
                ) {
                    await queryFulfilled;
                    return;
                }

                const resolvedFrom = fromCategoryId;
                const patches: Array<{ undo: () => void }> = [];

                patches.push(
                    dispatch(
                        categoriesApi.util.updateQueryData(
                            "getCategories",
                            undefined,
                            (draft) =>
                                adjustProductCountsInCache(draft, {
                                    fromCategoryId: resolvedFrom,
                                    toCategoryId: categoryId,
                                }),
                        ),
                    ),
                );

                for (const args of cachedArgs) {
                    patches.push(
                        dispatch(
                            productsQueryApi.util.updateQueryData(
                                "getProducts",
                                args,
                                (draft) => {
                                    const idx = draft.items.findIndex(
                                        (p) => p.id === id,
                                    );
                                    if (idx === -1) return;
                                    const stays =
                                        categories !== undefined
                                            ? matchesCategoryFilter(
                                                  categoryId,
                                                  args,
                                                  categories,
                                              )
                                            : args.categoryId === undefined ||
                                              args.categoryId === categoryId;
                                    const item = draft.items[idx];
                                    if (item === undefined) return;
                                    if (stays) {
                                        item.categoryId = categoryId;
                                    } else {
                                        draft.items.splice(idx, 1);
                                        draft.total = Math.max(
                                            0,
                                            draft.total - 1,
                                        );
                                    }
                                },
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
                    for (const patch of patches) {
                        patch.undo();
                    }
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
