// local dependencies
import { MovementsTable } from "./MovementsTable";
import { MovementsFilters } from "./MovementsFilters";
import { useJournalMovements } from "./useJournalSearch";
import { MovementsPagination } from "./MovementsPagination";
import { FullHeightPage } from "@/components/layout/FullHeightPage";

export function MovementsPage() {
    const { data } = useJournalMovements();

    return (
        <FullHeightPage
            header={
                <>
                    <div>
                        <h1 className="text-2xl font-semibold">Movements</h1>
                        {data !== undefined && (
                            <p className="text-sm text-muted-foreground">
                                {`${new Intl.NumberFormat("en-US").format(data.total)} movement${data.total !== 1 ? "s" : ""}`}
                            </p>
                        )}
                    </div>
                    <MovementsFilters />
                </>
            }
            footer={<MovementsPagination />}
        >
            <MovementsTable />
        </FullHeightPage>
    );
}
