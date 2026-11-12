// outsource dependencies
import { useCallback } from "react";
import { getRouteApi } from "@tanstack/react-router";

// local dependencies
import { applySearchPatch } from "@/lib/search";
import { toMovementsParams } from "./journalSearch";
import type { JournalSearch } from "./journalSearch";
import { useGetMovementsQuery } from "@/api/endpoints/movements";

const routeApi = getRouteApi("/movements");

export function useJournalSearch() {
    const navigate = routeApi.useNavigate();
    const search = routeApi.useSearch();

    const updateSearch = useCallback(
        (patch: Partial<JournalSearch>, options?: { replace?: boolean }) => {
            navigate({
                search: (prev) => applySearchPatch(prev, patch),
                replace: options?.replace,
            });
        },
        [navigate],
    );

    return { search, updateSearch };
}

export function useJournalMovements() {
    const { search } = useJournalSearch();
    return useGetMovementsQuery(toMovementsParams(search));
}
