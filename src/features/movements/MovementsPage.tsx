// local dependencies
import { MovementsTable } from "./MovementsTable";
import { useJournalMovements } from "./useJournalSearch";

export function MovementsPage() {
    const { data } = useJournalMovements();

    return (
        <div className="flex flex-col gap-4 p-6">
            <div>
                <h1 className="text-2xl font-semibold">Movements</h1>
                {data !== undefined && (
                    <p className="text-sm text-muted-foreground">
                        {data.total} movement{data.total !== 1 ? "s" : ""}
                    </p>
                )}
            </div>
            <MovementsTable />
        </div>
    );
}
