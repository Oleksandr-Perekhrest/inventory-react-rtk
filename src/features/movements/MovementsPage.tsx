// local dependencies
import { MovementsTable } from "./MovementsTable";
import { MovementsFilters } from "./MovementsFilters";
import { useJournalMovements } from "./useJournalSearch";
import { MovementsPagination } from "./MovementsPagination";

export function MovementsPage() {
    const { data } = useJournalMovements();

    return (
        <div className="flex flex-col gap-4 p-6">
            <div>
                <h1 className="text-2xl font-semibold">Movements</h1>
                {data !== undefined && (
                    <p className="text-sm text-muted-foreground">
                        {`${new Intl.NumberFormat("en-US").format(data.total)} movement${data.total !== 1 ? "s" : ""}`}
                    </p>
                )}
            </div>
            <MovementsFilters />
            <MovementsTable />
            <MovementsPagination />
        </div>
    );
}
