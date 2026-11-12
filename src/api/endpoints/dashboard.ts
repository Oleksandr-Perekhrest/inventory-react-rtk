// local dependencies
import { baseApi } from "../baseApi";
import type { DashboardSummary } from "../types";

const extendedApi = baseApi.injectEndpoints({
    endpoints: (build) => ({
        getDashboard: build.query<DashboardSummary, void>({
            query: () => ({ url: "/dashboard" }),
            providesTags: [
                { type: "Product" as const, id: "LIST" },
                { type: "Movement" as const, id: "LIST" },
            ],
        }),
    }),
});

export const { useGetDashboardQuery } = extendedApi;
