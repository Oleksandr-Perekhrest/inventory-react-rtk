// outsource dependencies
import type { LucideIcon } from "lucide-react";
import type { LinkProps } from "@tanstack/react-router";
import {
    House,
    Package,
    LayoutGrid,
    ChartColumn,
    ArrowLeftRight,
} from "lucide-react";

export const navIcons = {
    welcome: House,
    dashboard: ChartColumn,
    catalog: LayoutGrid,
    receiving: Package,
    movements: ArrowLeftRight,
} satisfies Record<string, LucideIcon>;

export const navItems: {
    to: LinkProps["to"];
    label: string;
    icon: LucideIcon;
    exact?: boolean;
}[] = [
    { to: "/", label: "Welcome", icon: navIcons.welcome, exact: true },
    { to: "/dashboard", label: "Dashboard", icon: navIcons.dashboard },
    { to: "/catalog", label: "Catalog", icon: navIcons.catalog },
    { to: "/receiving", label: "Receiving", icon: navIcons.receiving },
    { to: "/movements", label: "Movements", icon: navIcons.movements },
];
