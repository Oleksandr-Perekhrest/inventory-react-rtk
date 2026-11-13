// outsource dependencies
import { useMatchRoute } from "@tanstack/react-router";
import type { LinkProps } from "@tanstack/react-router";

export function useActiveNav(to: LinkProps["to"], exact?: boolean) {
    const matchRoute = useMatchRoute();
    return !!matchRoute({ to, fuzzy: !exact });
}
