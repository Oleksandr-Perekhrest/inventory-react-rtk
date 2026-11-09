// outsource dependencies
import { http, passthrough, HttpResponse } from "msw";
import { it, expect, afterAll, describe, afterEach, beforeAll } from "vitest";

// local dependencies
import "@/api/endpoints/demo";
import "@/api/endpoints/products";
import { baseApi } from "@/api/baseApi";
import { makeStore } from "@/store/store";
import { setBackendReady } from "@/api/backendReady";
import { createMockServer } from "@/test/mockServer";

const { db, server } = createMockServer();

beforeAll(() => server.listen({ onUnhandledFrame: "error" }));
afterEach(() => {
    server.resetHandlers();
    db.reset();
    setBackendReady(Promise.resolve());
});
afterAll(() => server.close());

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const ep = baseApi.endpoints as Record<string, any>;

describe("getProducts with categoryId", () => {
    it("returns exactly the products with that categoryId (includeDescendants: false)", async () => {
        const categoryId = db.products[0].categoryId;
        const expected = db.products.filter((p) => p.categoryId === categoryId);

        const store = makeStore();
        const result = await store.dispatch(
            ep.getProducts.initiate({
                categoryId,
                includeDescendants: false,
            }),
        );

        expect(result.error).toBeUndefined();
        expect(result.data?.total).toBe(expected.length);
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const ids = result.data?.items.map((p: any) => p.id).sort();
        expect(ids).toEqual(expected.map((p) => p.id).sort());
    });

    it("control: request without categoryId succeeds (no 400 for undefined params)", async () => {
        const store = makeStore();
        const result = await store.dispatch(ep.getProducts.initiate({}));
        expect(result.error).toBeUndefined();
        expect(result.data?.items).toBeDefined();
    });
});

describe("error normalization", () => {
    it("404 from backend becomes { status: 404, code: 'NOT_FOUND', message }", async () => {
        const store = makeStore();
        const result = await store.dispatch(
            ep.getProducts.initiate({
                categoryId: "non-existent-id",
                includeDescendants: false,
            }),
        );
        expect(result.error).toMatchObject({
            status: 404,
            code: "NOT_FOUND",
            message: expect.any(String),
        });
    });

    it("network failure becomes NETWORK_ERROR with the fixed readable message", async () => {
        server.use(http.get("/api/products", () => HttpResponse.error()));
        const store = makeStore();
        const result = await store.dispatch(ep.getProducts.initiate({}));
        expect(result.error).toMatchObject({
            status: "NETWORK_ERROR",
            code: "NETWORK_ERROR",
            message: "Network error. Check your connection and try again.",
        });
    });

    it("500 with non-JSON body gets PARSING_ERROR code", async () => {
        server.use(
            http.get(
                "/api/products",
                () =>
                    new HttpResponse("<html>Server Error</html>", {
                        status: 500,
                        headers: { "Content-Type": "text/html" },
                    }),
            ),
        );
        const store = makeStore();
        const result = await store.dispatch(ep.getProducts.initiate({}));
        expect(result.error).toMatchObject({
            status: "PARSING_ERROR",
            code: "PARSING_ERROR",
        });
    });
});

describe("backend readiness", () => {
    it("with pending backend promise, no request reaches the server until it resolves", async () => {
        let requestCount = 0;
        server.use(
            http.get("/api/products", () => {
                requestCount++;
                return passthrough();
            }),
        );

        let resolveBackend!: () => void;
        const backendPromise = new Promise<void>((resolve) => {
            resolveBackend = resolve;
        });
        setBackendReady(backendPromise);

        const store = makeStore();
        const dispatchPromise = store.dispatch(ep.getProducts.initiate({}));

        await new Promise<void>((resolve) => setTimeout(resolve, 50));
        expect(requestCount).toBe(0);

        resolveBackend();
        await dispatchPromise;
        expect(requestCount).toBe(1);
    });

    it("with rejected backend promise, result is BACKEND_UNAVAILABLE and no request is sent", async () => {
        let requestCount = 0;
        server.use(
            http.get("/api/products", () => {
                requestCount++;
                return passthrough();
            }),
        );

        const rejected = Promise.reject<void>(
            new Error("Backend failed to initialize"),
        );
        rejected.catch(() => {});
        setBackendReady(rejected);

        const store = makeStore();
        const result = await store.dispatch(ep.getProducts.initiate({}));

        expect(result.error).toMatchObject({
            status: "NETWORK_ERROR",
            code: "BACKEND_UNAVAILABLE",
        });
        expect(requestCount).toBe(0);
    });
});

describe("tag invalidation", () => {
    it("active getProducts subscription refetches after resetDemo succeeds", async () => {
        let callCount = 0;
        server.use(
            http.get("/api/products", () => {
                callCount++;
                return passthrough();
            }),
        );

        const store = makeStore();
        const subscription = store.dispatch(ep.getProducts.initiate({}));
        await subscription;
        expect(callCount).toBe(1);

        await store.dispatch(ep.resetDemo.initiate());

        await new Promise<void>((resolve) => setTimeout(resolve, 100));
        expect(callCount).toBe(2);

        subscription.unsubscribe();
    });

    it("control: without resetDemo, getProducts does not refetch", async () => {
        let callCount = 0;
        server.use(
            http.get("/api/products", () => {
                callCount++;
                return passthrough();
            }),
        );

        const store = makeStore();
        const subscription = store.dispatch(ep.getProducts.initiate({}));
        await subscription;
        expect(callCount).toBe(1);

        await new Promise<void>((resolve) => setTimeout(resolve, 100));
        expect(callCount).toBe(1);

        subscription.unsubscribe();
    });
});
