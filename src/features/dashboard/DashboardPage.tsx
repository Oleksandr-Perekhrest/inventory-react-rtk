// local dependencies
import { MetricCards } from "./MetricCards";
import { RunningLowPanel } from "./RunningLowPanel";
import { RecentMovementsPanel } from "./RecentMovementsPanel";

export function DashboardPage() {
    return (
        <div className="space-y-6 p-4 lg:p-6">
            <div>
                <h1 className="text-2xl font-semibold">Dashboard</h1>
                <p className="text-sm text-muted-foreground">
                    Warehouse overview and key metrics.
                </p>
            </div>
            <MetricCards />
            <div className="grid gap-6 lg:grid-cols-2">
                <div className="min-w-0">
                    <RunningLowPanel />
                </div>
                <div className="min-w-0">
                    <RecentMovementsPanel />
                </div>
            </div>
        </div>
    );
}
