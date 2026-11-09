// local dependencies
import type { MovementsParams } from "../queries";
import { baseApi, serializeParams } from "../baseApi";
import type { Paginated, MovementListItem } from "../types";

const extendedApi = baseApi.injectEndpoints({
    endpoints: (build) => ({
        getMovements: build.query<Paginated<MovementListItem>, MovementsParams>(
            {
                query: (params) => ({
                    url: "/movements",
                    params: serializeParams(params as Record<string, unknown>),
                }),
                providesTags: (result) => [
                    { type: "Movement" as const, id: "LIST" },
                    ...(result?.items ?? []).map((m) => ({
                        type: "Movement" as const,
                        id: m.id,
                    })),
                ],
            },
        ),
    }),
});

export const { useGetMovementsQuery } = extendedApi;
