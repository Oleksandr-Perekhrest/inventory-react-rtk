// outsource dependencies
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/movements")({
    component: MovementsPage,
});

// eslint-disable-next-line react-refresh/only-export-components
function MovementsPage() {
    return (
        <div className="p-6">
            <h1 className="text-2xl font-semibold">Movements</h1>
            <p className="text-muted-foreground">
                Track stock transfers between locations.
            </p>
        </div>
    );
}
