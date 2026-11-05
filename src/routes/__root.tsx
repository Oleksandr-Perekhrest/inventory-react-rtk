// outsource dependencies
import { Warehouse } from "lucide-react";
import type { CSSProperties } from "react";
import { Outlet, createRootRoute } from "@tanstack/react-router";

// local dependencies
import { TooltipProvider } from "@/components/ui/tooltip";
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
                        "--sidebar-width-icon": "3.5rem",
                    } as CSSProperties
                }
            >
                <AppSidebar />
                <SidebarInset>
                    <div className="flex items-center gap-2 border-b px-3 py-2 md:hidden">
                        <SidebarTrigger aria-label="Open menu" />
                        <div className="flex size-7 shrink-0 items-center justify-center rounded-sm bg-sidebar-primary">
                            <Warehouse className="size-4 text-sidebar-primary-foreground" />
                        </div>
                        <span className="font-semibold">Warehouse Manager</span>
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
