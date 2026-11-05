// outsource dependencies
import type { LucideIcon } from "lucide-react";
import { Link, useMatchRoute, type LinkProps } from "@tanstack/react-router";
import { Package, LayoutGrid, ChartColumn, ArrowLeftRight } from "lucide-react";

// local dependencies
import {
    Sidebar,
    SidebarMenu,
    SidebarGroup,
    SidebarHeader,
    SidebarContent,
    SidebarMenuItem,
    SidebarMenuButton,
    SidebarGroupContent,
} from "@/components/ui/sidebar";

const navItems: { to: LinkProps["to"]; label: string; icon: LucideIcon }[] = [
    { to: "/catalog", label: "Catalog", icon: LayoutGrid },
    { to: "/receiving", label: "Receiving", icon: Package },
    { to: "/movements", label: "Movements", icon: ArrowLeftRight },
    { to: "/dashboard", label: "Dashboard", icon: ChartColumn },
];

function NavLink({
    to,
    label,
    icon: Icon,
}: {
    to: LinkProps["to"];
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

export function AppSidebar() {
    return (
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
                                <NavLink key={String(item.to)} {...item} />
                            ))}
                        </SidebarMenu>
                    </SidebarGroupContent>
                </SidebarGroup>
            </SidebarContent>
        </Sidebar>
    );
}

export function NotFound() {
    return (
        <div className="flex flex-col items-center justify-center gap-4 p-8">
            <p className="text-muted-foreground">Page not found.</p>
            <Link to="/catalog" className="text-sm underline">
                Go to Catalog
            </Link>
        </div>
    );
}
