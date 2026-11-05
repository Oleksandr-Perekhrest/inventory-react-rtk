// outsource dependencies
import type { LucideIcon } from "lucide-react";
import type { LinkProps } from "@tanstack/react-router";
import { Package, LayoutGrid, ChartColumn, ArrowLeftRight } from "lucide-react";

export const navItems: {
    to: LinkProps["to"];
    label: string;
    icon: LucideIcon;
}[] = [
    { to: "/catalog", label: "Catalog", icon: LayoutGrid },
    { to: "/receiving", label: "Receiving", icon: Package },
    { to: "/movements", label: "Movements", icon: ArrowLeftRight },
    { to: "/dashboard", label: "Dashboard", icon: ChartColumn },
];
