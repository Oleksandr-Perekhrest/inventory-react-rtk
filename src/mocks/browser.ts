// outsource dependencies
import { setupWorker } from "msw/browser";

// local dependencies
import type { KeyValueStorage } from "./db";
import { defaultNetwork } from "./api/network";
import { createDb, createMemoryStorage } from "./db";
import { createHandlers } from "./api/createHandlers";

function getStorage(): KeyValueStorage {
    try {
        // verify localStorage is accessible before trusting it
        window.localStorage.getItem("");
        return window.localStorage;
    } catch {
        return createMemoryStorage();
    }
}

export const db = createDb({ storage: getStorage() });

export const worker = setupWorker(
    ...createHandlers({ db, network: defaultNetwork }),
);
