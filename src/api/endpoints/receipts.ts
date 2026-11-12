// local dependencies
import { baseApi } from "../baseApi";
import type { ReceiptResponse } from "../types";
import type { ReceiptPayload } from "../../domain/receiving";

const extendedApi = baseApi.injectEndpoints({
    endpoints: (build) => ({
        postReceipt: build.mutation<ReceiptResponse, ReceiptPayload>({
            query: (body) => ({
                url: "/receipts",
                method: "POST",
                body,
            }),
            invalidatesTags: (result, _error, arg) => {
                if (!result) return [];
                return [
                    { type: "Movement" as const, id: "LIST" },
                    { type: "Product" as const, id: "LIST" },
                    ...arg.lines.map((line) => ({
                        type: "Product" as const,
                        id: line.productId,
                    })),
                ];
            },
        }),
    }),
});

export const { usePostReceiptMutation } = extendedApi;
