// outsource dependencies
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/dashboard")({
    component: DashboardPage,
});

// eslint-disable-next-line react-refresh/only-export-components
function DashboardPage() {
    return (
        <div className="p-6">
            <h1 className="text-2xl font-semibold">Dashboard</h1>
            <p className="text-muted-foreground">
                Warehouse overview and key metrics.
            </p>
        </div>
    );
}
