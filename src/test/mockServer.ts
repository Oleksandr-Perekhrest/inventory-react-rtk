// outsource dependencies
import { setupServer } from "msw/node";

// local dependencies
import { createDb } from "@/mocks/db";
import { createMemoryStorage } from "@/mocks/db/storage";
import type { NetworkConfig } from "@/mocks/api/network";
import { createHandlers } from "@/mocks/api/createHandlers";

const FIXED_NOW = new Date("2026-11-06T07:00:00Z");

const testNetwork: NetworkConfig = {
    delay: 0,
    errorMode: () => "off",
    errorRate: 0,
    random: () => 0,
};

export function createMockServer() {
    const db = createDb({
        storage: createMemoryStorage(),
        now: () => FIXED_NOW,
    });
    const server = setupServer(...createHandlers({ db, network: testNetwork }));
    return { db, server };
}
