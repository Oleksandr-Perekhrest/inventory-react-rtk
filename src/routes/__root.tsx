// outsource dependencies
import type { LucideIcon } from "lucide-react";
import {
    Package,
    LayoutGrid,
    ArrowLeftRight,
    LayoutDashboard,
} from "lucide-react";
import {
    Link,
    Outlet,
    useMatchRoute,
    createRootRoute,
} from "@tanstack/react-router";

// local dependencies
import { TooltipProvider } from "@/components/ui/tooltip";
import {
    Sidebar,
    SidebarMenu,
    SidebarGroup,
    SidebarInset,
    SidebarHeader,
    SidebarContent,
    SidebarMenuItem,
    SidebarProvider,
    SidebarMenuButton,
    SidebarGroupContent,
} from "@/components/ui/sidebar";

const navItems: { to: string; label: string; icon: LucideIcon }[] = [
    { to: "/catalog", label: "Catalog", icon: LayoutGrid },
    { to: "/receiving", label: "Receiving", icon: Package },
    { to: "/movements", label: "Movements", icon: ArrowLeftRight },
    { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
];

// eslint-disable-next-line react-refresh/only-export-components
function NavLink({
    to,
    label,
    icon: Icon,
}: {
    to: string;
    label: string;
    icon: LucideIcon;
}) {
    const matchRoute = useMatchRoute();
    const isActive = !!matchRoute({ to, fuzzy: true });
    return (
        <SidebarMenuItem>
            <SidebarMenuButton asChild isActive={isActive}>
                <Link to={to}>
                    <Icon />
                    <span>{label}</span>
                </Link>
            </SidebarMenuButton>
        </SidebarMenuItem>
    );
}

// eslint-disable-next-line react-refresh/only-export-components
function AppLayout() {
    return (
        <TooltipProvider>
            <SidebarProvider>
                <Sidebar>
                    <SidebarHeader>
                        <span className="px-2 py-1 text-sm font-semibold">
                            Warehouse Manager
                        </span>
                    </SidebarHeader>
                    <SidebarContent>
                        <SidebarGroup>
                            <SidebarGroupContent>
                                <SidebarMenu>
                                    {navItems.map((item) => (
                                        <NavLink key={item.to} {...item} />
                                    ))}
                                </SidebarMenu>
                            </SidebarGroupContent>
                        </SidebarGroup>
                    </SidebarContent>
                </Sidebar>
                <SidebarInset>
                    <Outlet />
                </SidebarInset>
            </SidebarProvider>
        </TooltipProvider>
    );
}

// eslint-disable-next-line react-refresh/only-export-components
function NotFound() {
    return (
        <div className="flex flex-col items-center justify-center gap-4 p-8">
            <p className="text-muted-foreground">Page not found.</p>
            <Link to="/catalog" className="text-sm underline">
                Go to Catalog
            </Link>
        </div>
    );
}

export const Route = createRootRoute({
    component: AppLayout,
    notFoundComponent: NotFound,
});
