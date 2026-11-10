// outsource dependencies
import type { CSSProperties } from "react";
import { Outlet, createRootRouteWithContext } from "@tanstack/react-router";

// local dependencies
import type { AppStore } from "@/store/store";
import { MobileNav } from "@/components/layout/MobileNav";
import { TooltipProvider } from "@/components/ui/tooltip";
import { NotFound, AppSidebar } from "@/components/layout/AppSidebar";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";

export function RootLayout() {
    return (
        <TooltipProvider>
            <SidebarProvider
                style={
                    {
                        "--sidebar-width-icon": "5.5rem",
                    } as CSSProperties
                }
            >
                <div className="hidden lg:contents">
                    <AppSidebar />
                </div>
                <SidebarInset className="pb-[calc(4rem+env(safe-area-inset-bottom))] lg:pb-0">
                    <Outlet />
                </SidebarInset>
                <MobileNav />
            </SidebarProvider>
        </TooltipProvider>
    );
}

export const Route = createRootRouteWithContext<{ store: AppStore }>()({
    component: RootLayout,
    notFoundComponent: NotFound,
});
