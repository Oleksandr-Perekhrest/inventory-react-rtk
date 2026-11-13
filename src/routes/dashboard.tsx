// outsource dependencies
import { createFileRoute } from "@tanstack/react-router";

// local dependencies
import { movementsApi } from "@/api/endpoints/movements";
import { dashboardApi } from "@/api/endpoints/dashboard";
import { DashboardPage } from "@/features/dashboard/DashboardPage";

export const Route = createFileRoute("/dashboard")({
    loader: ({ context }) => {
        context.store.dispatch(
            dashboardApi.util.prefetch("getDashboard", undefined, {}),
        );
        context.store.dispatch(
            movementsApi.util.prefetch(
                "getMovements",
                { page: 1, pageSize: 5 },
                {},
            ),
        );
    },
    component: DashboardPage,
});
