// outsource dependencies
import type { LucideIcon } from "lucide-react";
import { Link, useMatchRoute, type LinkProps } from "@tanstack/react-router";
import {
    Package,
    Warehouse,
    LayoutGrid,
    ChartColumn,
    PanelLeftOpen,
    ArrowLeftRight,
    PanelLeftClose,
} from "lucide-react";

// local dependencies
import {
    Sidebar,
    useSidebar,
    SidebarMenu,
    SidebarRail,
    SidebarGroup,
    SidebarFooter,
    SidebarHeader,
    SidebarContent,
    SidebarMenuItem,
    SidebarSeparator,
    SidebarMenuButton,
    SidebarGroupContent,
} from "@/components/ui/sidebar";

const navItems: { to: LinkProps["to"]; label: string; icon: LucideIcon }[] = [
    { to: "/catalog", label: "Catalog", icon: LayoutGrid },
    { to: "/receiving", label: "Receiving", icon: Package },
    { to: "/movements", label: "Movements", icon: ArrowLeftRight },
    { to: "/dashboard", label: "Dashboard", icon: ChartColumn },
];

function SidebarLogo() {
    return (
        <div className="flex items-center gap-2 group-data-[collapsible=icon]:justify-center">
            <div className="flex size-8 shrink-0 items-center justify-center rounded-sm bg-sidebar-primary">
                <Warehouse className="size-4 text-sidebar-primary-foreground" />
            </div>
            <span className="font-semibold group-data-[collapsible=icon]:hidden">
                Warehouse Manager
            </span>
        </div>
    );
}

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
            <SidebarMenuButton
                asChild
                isActive={isActive}
                tooltip={label}
                className="[&_svg]:size-5 group-data-[collapsible=icon]:size-10!"
            >
                <Link to={to}>
                    <Icon />
                    <span>{label}</span>
                </Link>
            </SidebarMenuButton>
        </SidebarMenuItem>
    );
}

function CollapseButton() {
    const { state, toggleSidebar } = useSidebar();
    const isCollapsed = state === "collapsed";
    return (
        <SidebarMenuItem>
            <SidebarMenuButton
                onClick={toggleSidebar}
                tooltip="Expand sidebar"
                aria-label={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
                className="[&_svg]:size-5 group-data-[collapsible=icon]:size-10!"
            >
                {isCollapsed ? <PanelLeftOpen /> : <PanelLeftClose />}
                <span>Collapse</span>
            </SidebarMenuButton>
        </SidebarMenuItem>
    );
}

export function AppSidebar() {
    return (
        <Sidebar collapsible="icon">
            <SidebarHeader>
                <SidebarLogo />
            </SidebarHeader>
            <SidebarSeparator />
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
            <SidebarFooter>
                <SidebarMenu>
                    <CollapseButton />
                </SidebarMenu>
            </SidebarFooter>
            <SidebarRail />
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
