// outsource dependencies
import { createFileRoute, stripSearchParams } from "@tanstack/react-router";

// local dependencies
import { movementsApi } from "@/api/endpoints/movements";
import { MovementsPage } from "@/features/movements/MovementsPage";
import {
    toMovementsParams,
    journalSearchSchema,
    JOURNAL_SEARCH_DEFAULTS,
} from "@/features/movements/journalSearch";

export const Route = createFileRoute("/movements")({
    validateSearch: journalSearchSchema,
    search: {
        middlewares: [stripSearchParams(JOURNAL_SEARCH_DEFAULTS)],
    },
    loaderDeps: ({ search }) => search,
    loader: ({ context, deps }) => {
        context.store.dispatch(
            movementsApi.util.prefetch(
                "getMovements",
                toMovementsParams(deps),
                {},
            ),
        );
    },
    component: MovementsPage,
});
