// local dependencies
import type { Paginated } from "../types";
import type { Product } from "../../domain";
import type { ProductsParams } from "../queries";
import { baseApi, serializeParams } from "../baseApi";

const extendedApi = baseApi.injectEndpoints({
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

export const productsApi = extendedApi;
export const { useGetProductsQuery, useGetProductQuery } = extendedApi;
