// local dependencies
import { baseApi } from "../baseApi";
import type { Supplier } from "../../domain";

const extendedApi = baseApi.injectEndpoints({
    endpoints: (build) => ({
        getSuppliers: build.query<Supplier[], void>({
            query: () => "/suppliers",
            providesTags: (result) => [
                { type: "Supplier" as const, id: "LIST" },
                ...(result ?? []).map((s) => ({
                    type: "Supplier" as const,
                    id: s.id,
                })),
            ],
        }),
    }),
});

export const { useGetSuppliersQuery } = extendedApi;
