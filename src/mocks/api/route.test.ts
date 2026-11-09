// @vitest-environment node

// outsource dependencies
import { http } from "msw";
import { setupServer } from "msw/node";
import {
    it,
    vi,
    expect,
    describe,
    afterAll,
    afterEach,
    beforeAll,
} from "vitest";

// local dependencies
import { createDb } from "../db";
import { ApiError } from "./errors";
import { createRouteHandler } from "./route";
import type { NetworkConfig } from "./network";
import { demoReset } from "./controllers/demo";
import { createMemoryStorage } from "../db/storage";
import { listProducts, listProductsQuerySchema } from "./controllers/products";

const FIXED_NOW = new Date("2026-11-06T07:00:00Z");
const BASE = "http://localhost";

const db = createDb({ storage: createMemoryStorage(), now: () => FIXED_NOW });

let errorModeState: "off" | "random" = "off";
let randomImpl = () => Math.random();

const network: NetworkConfig = {
    delay: 0,
    errorRate: 0.2,
    errorMode: () => errorModeState,
    random: () => randomImpl(),
};

const route = createRouteHandler({ db, network });

const server = setupServer(
    http.post(`${BASE}/api/demo/reset`, route(demoReset)),
    http.get(
        `${BASE}/api/products`,
        route(listProducts, { querySchema: listProductsQuerySchema }),
    ),
);

beforeAll(() => server.listen());
afterEach(() => {
    server.resetHandlers();
    db.reset();
    errorModeState = "off";
    randomImpl = () => Math.random();
    vi.restoreAllMocks();
});
afterAll(() => server.close());

describe("unknown query parameter", () => {
    it("returns 400 INVALID_QUERY with the unknown param in fields", async () => {
        const res = await fetch(`${BASE}/api/products?unknownParam=x`);
        expect(res.status).toBe(400);
        const body: unknown = await res.json();
        expect(body).toMatchObject({
            error: {
                code: "INVALID_QUERY",
                fields: { unknownParam: expect.any(String) },
            },
        });
    });

    it("control: same request without the unknown param returns 200", async () => {
        const res = await fetch(`${BASE}/api/products`);
        expect(res.status).toBe(200);
    });
});

describe("page validation", () => {
    it("page=0 returns 400 INVALID_QUERY", async () => {
        const res = await fetch(`${BASE}/api/products?page=0`);
        expect(res.status).toBe(400);
        const body: unknown = await res.json();
        expect(body).toMatchObject({ error: { code: "INVALID_QUERY" } });
    });
});

describe("controller errors", () => {
    it("ApiError thrown by a controller keeps its status and error body shape", async () => {
        server.use(
            http.get(
                `${BASE}/api/test/api-error`,
                route(() => {
                    throw new ApiError(409, "TEST_CONFLICT", "conflict msg");
                }),
            ),
        );
        const res = await fetch(`${BASE}/api/test/api-error`);
        expect(res.status).toBe(409);
        const body: unknown = await res.json();
        expect(body).toEqual({
            error: { code: "TEST_CONFLICT", message: "conflict msg" },
        });
    });

    it("any other error returns 500 INTERNAL_ERROR", async () => {
        const errorSpy = vi
            .spyOn(console, "error")
            .mockImplementation(() => {});
        server.use(
            http.get(
                `${BASE}/api/test/generic-error`,
                route(() => {
                    throw new Error("boom");
                }),
            ),
        );
        const res = await fetch(`${BASE}/api/test/generic-error`);
        expect(res.status).toBe(500);
        const body: unknown = await res.json();
        expect(body).toEqual({
            error: {
                code: "INTERNAL_ERROR",
                message: "An unexpected error occurred",
            },
        });
        expect(errorSpy).toHaveBeenCalledTimes(1);
    });
});

describe("error simulation", () => {
    it("errorMode 'random' with random < errorRate and second < 0.5 returns 500 SIMULATED_FAILURE", async () => {
        errorModeState = "random";
        const values = [0.1, 0.4];
        let call = 0;
        randomImpl = () => values[call++] ?? 0.1;
        const res = await fetch(`${BASE}/api/products`);
        expect(res.status).toBe(500);
        const body: unknown = await res.json();
        expect(body).toMatchObject({ error: { code: "SIMULATED_FAILURE" } });
    });

    it("errorMode 'random' with random < errorRate and second >= 0.5 makes fetch reject", async () => {
        errorModeState = "random";
        const values = [0.1, 0.5];
        let call = 0;
        randomImpl = () => values[call++] ?? 0.1;
        await expect(fetch(`${BASE}/api/products`)).rejects.toThrow();
    });

    it("errorMode 'off' with the same stub returns 200", async () => {
        errorModeState = "off";
        const values = [0.1, 0.4];
        let call = 0;
        randomImpl = () => values[call++] ?? 0.1;
        const res = await fetch(`${BASE}/api/products`);
        expect(res.status).toBe(200);
    });
});

describe("delay", () => {
    it("delay [50, 50] makes the request take at least 45 ms", async () => {
        const delayNetwork: NetworkConfig = {
            delay: [50, 50],
            errorRate: 0,
            errorMode: () => "off",
            random: () => 0.5,
        };
        const delayRoute = createRouteHandler({ db, network: delayNetwork });
        server.use(
            http.get(
                `${BASE}/api/test/delayed`,
                delayRoute(() => ({ body: "ok" })),
            ),
        );
        const start = Date.now();
        const res = await fetch(`${BASE}/api/test/delayed`);
        const elapsed = Date.now() - start;
        expect(res.status).toBe(200);
        expect(elapsed).toBeGreaterThanOrEqual(45);
    });
});

describe("POST /api/demo/reset", () => {
    it("returns 204 and restores data changed before it", async () => {
        const originalName = db.products[0].name;
        db.transaction((draft) => {
            draft.products[0].name = "MODIFIED_FOR_RESET_TEST";
        });
        expect(db.products[0].name).toBe("MODIFIED_FOR_RESET_TEST");

        const res = await fetch(`${BASE}/api/demo/reset`, { method: "POST" });
        expect(res.status).toBe(204);
        expect(db.products[0].name).toBe(originalName);
    });
});
