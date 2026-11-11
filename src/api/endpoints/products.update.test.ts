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
import { productsApi } from "@/api/endpoints/products";
import { categoriesApi } from "@/api/endpoints/categories";

const { db, server } = createMockServer();

const PAGE_SIZE = 100;
const L1 = { categoryId: "cat-cheese", pageSize: PAGE_SIZE };
const L2 = {
    categoryId: "cat-hard-cheese",
    includeDescendants: false,
    pageSize: PAGE_SIZE,
};
const L3 = {
    categoryId: "cat-soft-cheese",
    includeDescendants: false,
    pageSize: PAGE_SIZE,
};

beforeAll(() => server.listen());
afterEach(() => {
    server.resetHandlers();
    db.reset();
    setBackendReady(Promise.resolve());
});
afterAll(() => server.close());

describe("updateProduct mutation – optimistic update and rollback", () => {
    it(
        "optimistic (gate closed): L1 updated in-place, L2 drops item, " +
            "L3 unchanged (refetch adds it), tree counts adjusted",
        async () => {
            const store = makeStore();
            const catSub = store.dispatch(
                categoriesApi.endpoints.getCategories.initiate(),
            );
            const l1Sub = store.dispatch(
                productsApi.endpoints.getProducts.initiate(L1),
            );
            const l2Sub = store.dispatch(
                productsApi.endpoints.getProducts.initiate(L2),
            );
            const l3Sub = store.dispatch(
                productsApi.endpoints.getProducts.initiate(L3),
            );
            await Promise.all([catSub, l1Sub, l2Sub, l3Sub]);

            const l1Before = productsApi.endpoints.getProducts.select(L1)(
                store.getState(),
            ).data;
            const l2Before = productsApi.endpoints.getProducts.select(L2)(
                store.getState(),
            ).data;
            const l3Before = productsApi.endpoints.getProducts.select(L3)(
                store.getState(),
            ).data;
            const catBefore = categoriesApi.endpoints.getCategories.select()(
                store.getState(),
            ).data;

            assert(l1Before !== undefined, "L1 cache missing");
            assert(l2Before !== undefined, "L2 cache missing");
            assert(l3Before !== undefined, "L3 cache missing");
            assert(catBefore !== undefined, "categories cache missing");

            // preconditions: prd-0001 must be on page 1 of both L1 and L2
            assert(
                l1Before.items.some((p) => p.id === "prd-0001"),
                "prd-0001 not on page 1 of L1",
            );
            assert(
                l2Before.items.some((p) => p.id === "prd-0001"),
                "prd-0001 not on page 1 of L2",
            );

            const hardCheeseBefore = catBefore.entities["cat-hard-cheese"];
            const softCheeseBefore = catBefore.entities["cat-soft-cheese"];
            const cheeseBefore = catBefore.entities["cat-cheese"];
            assert(hardCheeseBefore !== undefined);
            assert(softCheeseBefore !== undefined);
            assert(cheeseBefore !== undefined);

            let resolveGate!: () => void;
            const gate = new Promise<void>((resolve) => {
                resolveGate = resolve;
            });
            server.use(
                http.patch("/api/products/:id", async () => {
                    await gate;
                    // return nothing → MSW falls through to the real handler
                }),
            );

            const mutationPromise = store.dispatch(
                productsApi.endpoints.updateProduct.initiate({
                    id: "prd-0001",
                    categoryId: "cat-soft-cheese",
                }),
            );

            // onQueryStarted dispatches updateQueryData synchronously before its first await
            const l1Opt = productsApi.endpoints.getProducts.select(L1)(
                store.getState(),
            ).data;
            const l2Opt = productsApi.endpoints.getProducts.select(L2)(
                store.getState(),
            ).data;
            const l3Opt = productsApi.endpoints.getProducts.select(L3)(
                store.getState(),
            ).data;
            const catOpt = categoriesApi.endpoints.getCategories.select()(
                store.getState(),
            ).data;

            assert(l1Opt !== undefined);
            assert(l2Opt !== undefined);
            assert(l3Opt !== undefined);
            assert(catOpt !== undefined);

            // L1: prd-0001 stays in list, categoryId updated, total unchanged
            const prd0001InL1 = l1Opt.items.find((p) => p.id === "prd-0001");
            assert(
                prd0001InL1 !== undefined,
                "prd-0001 missing from L1 during optimistic update",
            );
            expect(prd0001InL1.categoryId).toBe("cat-soft-cheese");
            expect(l1Opt.total).toBe(l1Before.total);

            // L2: prd-0001 removed, total -1
            expect(l2Opt.items.some((p) => p.id === "prd-0001")).toBe(false);
            expect(l2Opt.total).toBe(l2Before.total - 1);

            // L3: unchanged (product NOT inserted optimistically — refetch adds it)
            expect(l3Opt.items).toEqual(l3Before.items);
            expect(l3Opt.total).toBe(l3Before.total);

            // tree: cat-hard-cheese -1, cat-soft-cheese +1, cat-cheese total unchanged
            const hardCheeseOpt = catOpt.entities["cat-hard-cheese"];
            const softCheeseOpt = catOpt.entities["cat-soft-cheese"];
            const cheeseOpt = catOpt.entities["cat-cheese"];
            assert(hardCheeseOpt !== undefined);
            assert(softCheeseOpt !== undefined);
            assert(cheeseOpt !== undefined);

            expect(hardCheeseOpt.productCount).toBe(
                hardCheeseBefore.productCount - 1,
            );
            expect(softCheeseOpt.productCount).toBe(
                softCheeseBefore.productCount + 1,
            );
            expect(cheeseOpt.totalProductCount).toBe(
                cheeseBefore.totalProductCount,
            );

            resolveGate();
            await mutationPromise;
            catSub.unsubscribe();
            l1Sub.unsubscribe();
            l2Sub.unsubscribe();
            l3Sub.unsubscribe();
        },
    );

    it(
        "after refetch settles: L3 gains prd-0001, tree entities match optimistic snapshot, " +
            "L1 (id, categoryId) pairs match optimistic snapshot",
        async () => {
            const store = makeStore();
            const catSub = store.dispatch(
                categoriesApi.endpoints.getCategories.initiate(),
            );
            const l1Sub = store.dispatch(
                productsApi.endpoints.getProducts.initiate(L1),
            );
            const l2Sub = store.dispatch(
                productsApi.endpoints.getProducts.initiate(L2),
            );
            const l3Sub = store.dispatch(
                productsApi.endpoints.getProducts.initiate(L3),
            );
            await Promise.all([catSub, l1Sub, l2Sub, l3Sub]);

            const catTsBefore =
                categoriesApi.endpoints.getCategories.select()(store.getState())
                    .fulfilledTimeStamp ?? 0;
            const l3TsBefore =
                productsApi.endpoints.getProducts.select(L3)(store.getState())
                    .fulfilledTimeStamp ?? 0;

            let resolveGate!: () => void;
            const gate = new Promise<void>((resolve) => {
                resolveGate = resolve;
            });
            server.use(
                http.patch("/api/products/:id", async () => {
                    await gate;
                }),
            );

            const mutationPromise = store.dispatch(
                productsApi.endpoints.updateProduct.initiate({
                    id: "prd-0001",
                    categoryId: "cat-soft-cheese",
                }),
            );

            // snapshot optimistic state before opening gate
            const optimisticCatEntities =
                categoriesApi.endpoints.getCategories.select()(store.getState())
                    .data?.entities;
            const optimisticL1Items = productsApi.endpoints.getProducts
                .select(L1)(store.getState())
                .data?.items.map((p) => ({
                    id: p.id,
                    categoryId: p.categoryId,
                }));

            resolveGate();
            await mutationPromise;

            // wait for categories and L3 refetches triggered by invalidatesTags
            await vi.waitFor(() => {
                const catTs =
                    categoriesApi.endpoints.getCategories.select()(
                        store.getState(),
                    ).fulfilledTimeStamp ?? 0;
                const l3Ts =
                    productsApi.endpoints.getProducts.select(L3)(
                        store.getState(),
                    ).fulfilledTimeStamp ?? 0;
                expect(catTs).toBeGreaterThan(catTsBefore);
                expect(l3Ts).toBeGreaterThan(l3TsBefore);
            });

            const catEntitiesAfter =
                categoriesApi.endpoints.getCategories.select()(store.getState())
                    .data?.entities;
            const l3ItemsAfter = productsApi.endpoints.getProducts.select(L3)(
                store.getState(),
            ).data?.items;
            const l1ItemsAfter = productsApi.endpoints.getProducts.select(L1)(
                store.getState(),
            ).data?.items;

            // L3 now contains prd-0001 after the server refetch
            expect(l3ItemsAfter?.some((p) => p.id === "prd-0001")).toBe(true);

            // tree entities match the optimistic snapshot: server agrees with the prediction
            expect(catEntitiesAfter).toEqual(optimisticCatEntities);

            // L1 (id, categoryId) pairs match the optimistic snapshot
            const l1PairsAfter = l1ItemsAfter?.map((p) => ({
                id: p.id,
                categoryId: p.categoryId,
            }));
            expect(l1PairsAfter).toEqual(optimisticL1Items);

            catSub.unsubscribe();
            l1Sub.unsubscribe();
            l2Sub.unsubscribe();
            l3Sub.unsubscribe();
        },
    );

    it("rollback on 500: tree and all three lists revert to pre-move state", async () => {
        const store = makeStore();
        const catSub = store.dispatch(
            categoriesApi.endpoints.getCategories.initiate(),
        );
        const l1Sub = store.dispatch(
            productsApi.endpoints.getProducts.initiate(L1),
        );
        const l2Sub = store.dispatch(
            productsApi.endpoints.getProducts.initiate(L2),
        );
        const l3Sub = store.dispatch(
            productsApi.endpoints.getProducts.initiate(L3),
        );
        await Promise.all([catSub, l1Sub, l2Sub, l3Sub]);

        const catBefore = structuredClone(
            categoriesApi.endpoints.getCategories.select()(store.getState())
                .data?.entities,
        );
        const l1Before = structuredClone(
            productsApi.endpoints.getProducts.select(L1)(store.getState()).data,
        );
        const l2Before = structuredClone(
            productsApi.endpoints.getProducts.select(L2)(store.getState()).data,
        );
        const l3Before = structuredClone(
            productsApi.endpoints.getProducts.select(L3)(store.getState()).data,
        );

        let resolveGate!: () => void;
        const gate = new Promise<void>((resolve) => {
            resolveGate = resolve;
        });
        server.use(
            http.patch("/api/products/:id", async () => {
                await gate;
                return HttpResponse.json(
                    { error: { code: "SIMULATED_FAILURE", message: "x" } },
                    { status: 500 },
                );
            }),
        );

        const mutationPromise = store.dispatch(
            productsApi.endpoints.updateProduct.initiate({
                id: "prd-0001",
                categoryId: "cat-soft-cheese",
            }),
        );

        resolveGate();
        const result = await mutationPromise;

        expect(result.error).toBeDefined();

        const catAfter = categoriesApi.endpoints.getCategories.select()(
            store.getState(),
        ).data?.entities;
        const l1After = productsApi.endpoints.getProducts.select(L1)(
            store.getState(),
        ).data;
        const l2After = productsApi.endpoints.getProducts.select(L2)(
            store.getState(),
        ).data;
        const l3After = productsApi.endpoints.getProducts.select(L3)(
            store.getState(),
        ).data;

        expect(catAfter).toEqual(catBefore);
        expect(l1After).toEqual(l1Before);
        expect(l2After).toEqual(l2Before);
        expect(l3After).toEqual(l3Before);

        catSub.unsubscribe();
        l1Sub.unsubscribe();
        l2Sub.unsubscribe();
        l3Sub.unsubscribe();
    });

    it(
        "product absent from all cached lists (prd-0067, cat-juices): " +
            "no optimistic change while pending; mutation resolves successfully",
        async () => {
            const store = makeStore();
            const catSub = store.dispatch(
                categoriesApi.endpoints.getCategories.initiate(),
            );
            const l1Sub = store.dispatch(
                productsApi.endpoints.getProducts.initiate(L1),
            );
            const l2Sub = store.dispatch(
                productsApi.endpoints.getProducts.initiate(L2),
            );
            const l3Sub = store.dispatch(
                productsApi.endpoints.getProducts.initiate(L3),
            );
            await Promise.all([catSub, l1Sub, l2Sub, l3Sub]);

            const catSnapshot = categoriesApi.endpoints.getCategories.select()(
                store.getState(),
            ).data?.entities;
            const l1Snapshot = productsApi.endpoints.getProducts.select(L1)(
                store.getState(),
            ).data;
            const l2Snapshot = productsApi.endpoints.getProducts.select(L2)(
                store.getState(),
            ).data;
            const l3Snapshot = productsApi.endpoints.getProducts.select(L3)(
                store.getState(),
            ).data;

            let resolveGate!: () => void;
            const gate = new Promise<void>((resolve) => {
                resolveGate = resolve;
            });
            server.use(
                http.patch("/api/products/:id", async () => {
                    await gate;
                    // return nothing → MSW falls through to the real handler
                }),
            );

            const mutationResult = store.dispatch(
                productsApi.endpoints.updateProduct.initiate({
                    id: "prd-0067",
                    categoryId: "cat-soft-cheese",
                }),
            );

            // while pending: no optimistic update fires (product not in any cached list)
            expect(
                categoriesApi.endpoints.getCategories.select()(store.getState())
                    .data?.entities,
            ).toBe(catSnapshot);
            expect(
                productsApi.endpoints.getProducts.select(L1)(store.getState())
                    .data,
            ).toBe(l1Snapshot);
            expect(
                productsApi.endpoints.getProducts.select(L2)(store.getState())
                    .data,
            ).toBe(l2Snapshot);
            expect(
                productsApi.endpoints.getProducts.select(L3)(store.getState())
                    .data,
            ).toBe(l3Snapshot);

            resolveGate();
            await expect(mutationResult.unwrap()).resolves.toBeDefined();

            catSub.unsubscribe();
            l1Sub.unsubscribe();
            l2Sub.unsubscribe();
            l3Sub.unsubscribe();
        },
    );
});
