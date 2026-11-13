// outsource dependencies
import type { LucideIcon } from "lucide-react";
import { useMatchRoute } from "@tanstack/react-router";
import type { LinkProps } from "@tanstack/react-router";

// local dependencies
import { navItems } from "@/components/layout/navItems";

export function useActiveNavItem(): {
    to: LinkProps["to"];
    label: string;
    icon: LucideIcon;
} | null {
    const matchRoute = useMatchRoute();
    return (
        navItems.find(
            (item) => !!matchRoute({ to: item.to, fuzzy: !item.exact }),
        ) ?? null
    );
}
