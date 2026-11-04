// outsource dependencies
import { Outlet, createRootRoute } from "@tanstack/react-router";

// local dependencies
import { TooltipProvider } from "@/components/ui/tooltip";
import { NotFound, AppSidebar } from "@/components/layout/AppSidebar";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";

export function RootLayout() {
    return (
        <TooltipProvider>
            <SidebarProvider>
                <AppSidebar />
                <SidebarInset>
                    <Outlet />
                </SidebarInset>
            </SidebarProvider>
        </TooltipProvider>
    );
}

export const Route = createRootRoute({
    component: RootLayout,
    notFoundComponent: NotFound,
});
