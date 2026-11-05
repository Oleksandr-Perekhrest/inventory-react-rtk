// outsource dependencies
import type { CSSProperties } from "react";
import { Outlet, createRootRoute } from "@tanstack/react-router";

// local dependencies
import { TooltipProvider } from "@/components/ui/tooltip";
import { WarehouseLogo } from "@/components/layout/WarehouseLogo";
import { NotFound, AppSidebar } from "@/components/layout/AppSidebar";
import {
    SidebarInset,
    SidebarTrigger,
    SidebarProvider,
} from "@/components/ui/sidebar";

export function RootLayout() {
    return (
        <TooltipProvider>
            <SidebarProvider
                style={
                    {
                        "--sidebar-width-icon": "5rem",
                    } as CSSProperties
                }
            >
                <AppSidebar />
                <SidebarInset>
                    <div className="flex items-center gap-2 border-b px-3 py-2 md:hidden">
                        <SidebarTrigger aria-label="Open menu" />
                        <WarehouseLogo small />
                    </div>
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
