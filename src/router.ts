// outsource dependencies
import type { ErrorRouteComponent } from "@tanstack/react-router";

// local dependencies
import { RouteError } from "./components/layout/RouteError";

export const routerDefaults: { defaultErrorComponent: ErrorRouteComponent } = {
    defaultErrorComponent: RouteError,
};
