// outsource dependencies
import { createApi, fetchBaseQuery } from "@reduxjs/toolkit/query/react";
import type {
    FetchArgs,
    BaseQueryFn,
    FetchBaseQueryError,
} from "@reduxjs/toolkit/query";

// local dependencies
import { waitForBackend } from "./backendReady";
import type { ApiErrorBody, ApiErrorData } from "./types";

function normalizeError(error: FetchBaseQueryError): ApiErrorData {
    if (typeof error.status === "number") {
        const body = error.data as ApiErrorBody | undefined;
        return {
            status: error.status,
            code: body?.error?.code ?? "HTTP_ERROR",
            message: body?.error?.message ?? `HTTP ${error.status}`,
            fields: body?.error?.fields,
        };
    }
    if (error.status === "PARSING_ERROR") {
        return {
            status: "PARSING_ERROR",
            code: "PARSING_ERROR",
            message: error.error || "Failed to parse response",
        };
    }
    return {
        status: "NETWORK_ERROR",
        code: "NETWORK_ERROR",
        message:
            (error as { error?: string }).error ?? "Network request failed",
    };
}

export function serializeParams(
    params: Record<string, unknown>,
): Record<string, string> {
    const result: Record<string, string> = {};
    for (const [key, value] of Object.entries(params)) {
        if (value === undefined) continue;
        result[key] =
            typeof value === "boolean"
                ? value
                    ? "true"
                    : "false"
                : String(value);
    }
    return result;
}

const rawBaseQuery = fetchBaseQuery({
    baseUrl: new URL("/api", window.location.origin).toString(),
});

const baseQueryWithBackend: BaseQueryFn<
    string | FetchArgs,
    unknown,
    ApiErrorData
> = async (args, api, extraOptions) => {
    await waitForBackend();
    const result = await rawBaseQuery(args, api, extraOptions);
    if (result.error) {
        return { error: normalizeError(result.error) };
    }
    return result;
};

export const baseApi = createApi({
    reducerPath: "api",
    baseQuery: baseQueryWithBackend,
    tagTypes: ["Category", "Product", "Supplier", "Movement"] as const,
    endpoints: () => ({}),
});
