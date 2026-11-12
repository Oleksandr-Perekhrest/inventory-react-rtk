// outsource dependencies
import { useEffect } from "react";

// local dependencies
import { toMovementsParams } from "./journalSearch";
import { movementsApi } from "@/api/endpoints/movements";
import { TablePagination } from "@/components/TablePagination";
import { useJournalSearch, useJournalMovements } from "./useJournalSearch";

export function MovementsPagination() {
    const { search, updateSearch } = useJournalSearch();
    const { data } = useJournalMovements();
    const prefetchMovements = movementsApi.usePrefetch("getMovements");

    const total = data?.total ?? 0;
    const { page, pageSize } = search;

    useEffect(() => {
        if (!data || data.total === 0) return;
        const computedLast = Math.ceil(data.total / search.pageSize);
        if (search.page > computedLast) {
            updateSearch({ page: computedLast }, { replace: true });
        }
    }, [data, search.page, search.pageSize, updateSearch]);

    return (
        <TablePagination
            page={page}
            pageSize={pageSize}
            total={total}
            onPageChange={(p) => updateSearch({ page: p })}
            onPageSizeChange={(size) => updateSearch({ pageSize: size })}
            onPrefetchPage={(p) =>
                prefetchMovements(toMovementsParams({ ...search, page: p }))
            }
        />
    );
}
