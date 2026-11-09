// outsource dependencies
import { http } from "msw";
import type { AnyHandler } from "msw";

// local dependencies
import type { Db } from "../db";
import { createRouteHandler } from "./route";
import { demoReset } from "./controllers/demo";
import type { NetworkConfig } from "./network";

export function createHandlers({
    db,
    network,
}: {
    db: Db;
    network: NetworkConfig;
}): AnyHandler[] {
    const route = createRouteHandler({ db, network });

    return [http.post("/api/demo/reset", route(demoReset))];
}
