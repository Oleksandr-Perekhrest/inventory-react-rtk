// local dependencies
import { baseApi } from "../baseApi";

const extendedApi = baseApi.injectEndpoints({
    endpoints: (build) => ({
        resetDemo: build.mutation<void, void>({
            query: () => ({ url: "/demo/reset", method: "POST" }),
            invalidatesTags: ["Category", "Product", "Supplier", "Movement"],
        }),
    }),
});

export const demoApi = extendedApi;
export const { useResetDemoMutation } = extendedApi;
