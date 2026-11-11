// outsource dependencies
import { http, HttpResponse } from "msw";
import {
    it,
    vi,
    assert,
    expect,
    afterAll,
    describe,
    afterEach,
    beforeAll,
} from "vitest";

// local dependencies
import { makeStore } from "@/store/store";
import { setBackendReady } from "@/api/backendReady";
import { createMockServer } from "@/test/mockServer";
import { categoriesApi } from "@/api/endpoints/categories";

const { db, server } = createMockServer();

beforeAll(() => server.listen());
afterEach(() => {
    server.resetHandlers();
    db.reset();
    setBackendReady(Promise.resolve());
});
afterAll(() => server.close());

describe("moveCategory mutation", () => {
    it("optimistic: cache reflects the move before the response arrives", async () => {
        const store = makeStore();
        const sub = store.dispatch(
            categoriesApi.endpoints.getCategories.initiate(),
        );
        await sub;

        const dataBefore = categoriesApi.endpoints.getCategories.select()(
            store.getState(),
        ).data;
        const milkCreamBefore = dataBefore?.entities["cat-milk-cream"];
        const dairyBefore = dataBefore?.entities["cat-dairy"];
        const packagingBefore = dataBefore?.entities["cat-packaging"];
        assert(milkCreamBefore !== undefined, "cat-milk-cream not in cache");
        assert(dairyBefore !== undefined, "cat-dairy not in cache");
        assert(packagingBefore !== undefined, "cat-packaging not in cache");

        const milkCreamTotal = milkCreamBefore.totalProductCount;
        const dairyTotalBefore = dairyBefore.totalProductCount;
        const packagingTotalBefore = packagingBefore.totalProductCount;

        let resolveGate!: () => void;
        const gate = new Promise<void>((resolve) => {
            resolveGate = resolve;
        });
        server.use(
            http.post("/api/categories/:id/move", async () => {
                await gate;
                // return nothing → MSW falls through to the real handler
            }),
        );

        // Dispatch but do not await — the gate is closed, request is in-flight
        const mutationPromise = store.dispatch(
            categoriesApi.endpoints.moveCategory.initiate({
                id: "cat-milk-cream",
                parentId: "cat-packaging",
                index: 0,
            }),
        );

        // onQueryStarted dispatches updateQueryData synchronously before its first await
        const dataAfter = categoriesApi.endpoints.getCategories.select()(
            store.getState(),
        ).data;
        const milkCreamAfter = dataAfter?.entities["cat-milk-cream"];
        const dairyAfter = dataAfter?.entities["cat-dairy"];
        const packagingAfter = dataAfter?.entities["cat-packaging"];
        assert(milkCreamAfter !== undefined);
        assert(dairyAfter !== undefined);
        assert(packagingAfter !== undefined);

        expect(milkCreamAfter.parentId).toBe("cat-packaging");
        expect(milkCreamAfter.position).toBe(0);
        expect(dairyAfter.totalProductCount).toBe(
            dairyTotalBefore - milkCreamTotal,
        );
        expect(packagingAfter.totalProductCount).toBe(
            packagingTotalBefore + milkCreamTotal,
        );

        resolveGate();
        await mutationPromise;
        sub.unsubscribe();
    });

    it("optimistic equals server: refetched entities deep-equal the optimistic snapshot", async () => {
        const store = makeStore();
        const sub = store.dispatch(
            categoriesApi.endpoints.getCategories.initiate(),
        );
        await sub;

        const tsAfterInitialLoad =
            categoriesApi.endpoints.getCategories.select()(store.getState())
                .fulfilledTimeStamp ?? 0;

        let resolveGate!: () => void;
        const gate = new Promise<void>((resolve) => {
            resolveGate = resolve;
        });
        server.use(
            http.post("/api/categories/:id/move", async () => {
                await gate;
            }),
        );

        const mutationPromise = store.dispatch(
            categoriesApi.endpoints.moveCategory.initiate({
                id: "cat-milk-cream",
                parentId: "cat-packaging",
                index: 0,
            }),
        );

        // Snapshot optimistic state before opening gate
        const optimisticEntities =
            categoriesApi.endpoints.getCategories.select()(store.getState())
                .data?.entities;

        resolveGate();
        await mutationPromise;

        // After mutation, invalidatesTags triggers a refetch; wait for the new
        // fulfilledTimeStamp to exceed the one recorded before the move
        await vi.waitFor(() => {
            const state = categoriesApi.endpoints.getCategories.select()(
                store.getState(),
            );
            expect(state.fulfilledTimeStamp ?? 0).toBeGreaterThan(
                tsAfterInitialLoad,
            );
        });

        const refetchedEntities =
            categoriesApi.endpoints.getCategories.select()(store.getState())
                .data?.entities;

        expect(refetchedEntities).toEqual(optimisticEntities);

        sub.unsubscribe();
    });

    it("rollback: 500 response reverts cache to pre-move state; db is unchanged", async () => {
        const store = makeStore();
        const sub = store.dispatch(
            categoriesApi.endpoints.getCategories.initiate(),
        );
        await sub;

        const entitiesBefore = structuredClone(
            categoriesApi.endpoints.getCategories.select()(store.getState())
                .data?.entities,
        );
        const dbCategoriesBefore = structuredClone([...db.categories]);

        let resolveGate!: () => void;
        const gate = new Promise<void>((resolve) => {
            resolveGate = resolve;
        });
        server.use(
            http.post("/api/categories/:id/move", async () => {
                await gate;
                return HttpResponse.json(
                    { error: { code: "SIMULATED_FAILURE", message: "x" } },
                    { status: 500 },
                );
            }),
        );

        const mutationPromise = store.dispatch(
            categoriesApi.endpoints.moveCategory.initiate({
                id: "cat-milk-cream",
                parentId: "cat-packaging",
                index: 0,
            }),
        );

        resolveGate();
        const result = await mutationPromise;

        expect(result.error).toBeDefined();

        const entitiesAfterRollback =
            categoriesApi.endpoints.getCategories.select()(store.getState())
                .data?.entities;

        expect(entitiesAfterRollback).toEqual(entitiesBefore);
        expect([...db.categories]).toEqual(dbCategoriesBefore);

        sub.unsubscribe();
    });

    it("rejected move (into own child): cache unchanged while pending, result error is 422 INVALID_MOVE", async () => {
        const store = makeStore();
        const sub = store.dispatch(
            categoriesApi.endpoints.getCategories.initiate(),
        );
        await sub;

        const entitiesBefore = categoriesApi.endpoints.getCategories.select()(
            store.getState(),
        ).data?.entities;

        let resolveGate!: () => void;
        const gate = new Promise<void>((resolve) => {
            resolveGate = resolve;
        });
        server.use(
            http.post("/api/categories/:id/move", async () => {
                await gate;
            }),
        );

        const mutationPromise = store.dispatch(
            categoriesApi.endpoints.moveCategory.initiate({
                id: "cat-dairy",
                parentId: "cat-cheese",
                index: 0,
            }),
        );

        // moveCategory returns ok:false → applyCategoryMoveToCache returns early → no optimistic change
        const entitiesDuringPending =
            categoriesApi.endpoints.getCategories.select()(store.getState())
                .data?.entities;
        expect(entitiesDuringPending).toEqual(entitiesBefore);

        resolveGate();
        const result = await mutationPromise;

        expect(result.error).toMatchObject({
            status: 422,
            code: "INVALID_MOVE",
        });

        sub.unsubscribe();
    });
});
