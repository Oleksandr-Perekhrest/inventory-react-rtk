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
import { isApiErrorData } from "@/api/errors";
import { setBackendReady } from "@/api/backendReady";
import { createMockServer } from "@/test/mockServer";
import { receiptsApi } from "@/api/endpoints/receipts";
import { productsApi } from "@/api/endpoints/products";
import { categoriesApi } from "@/api/endpoints/categories";

const { db, server } = createMockServer();

// prd-0001 (Aged Cheddar, perishable, kg) lives in cat-hard-cheese; initial qty 125.5
const PRODUCTS_PARAMS = {
    categoryId: "cat-hard-cheese",
    pageSize: 20,
} as const;

beforeAll(() => server.listen());
afterEach(() => {
    server.resetHandlers();
    db.reset();
    setBackendReady(Promise.resolve());
});
afterAll(() => server.close());

describe("postReceipt mutation", () => {
    it(
        "success: getProducts and getProduct(id) refetch with updated quantity; " +
            "getCategories is NOT refetched",
        async () => {
            const store = makeStore();

            // Track all GET requests made after setup
            let productsListCount = 0;
            let productItemCount = 0;
            let categoriesCount = 0;
            server.use(
                http.get("/api/products", () => {
                    productsListCount++;
                }),
                http.get("/api/products/:id", () => {
                    productItemCount++;
                }),
                http.get("/api/categories", () => {
                    categoriesCount++;
                }),
            );

            // Subscribe and wait for initial fetches
            const catSub = store.dispatch(
                categoriesApi.endpoints.getCategories.initiate(),
            );
            const prodsSub = store.dispatch(
                productsApi.endpoints.getProducts.initiate(PRODUCTS_PARAMS),
            );
            const prodSub = store.dispatch(
                productsApi.endpoints.getProduct.initiate("prd-0001"),
            );
            await Promise.all([catSub, prodsSub, prodSub]);

            // Snapshots before mutation
            const prodsTsBefore =
                productsApi.endpoints.getProducts.select(PRODUCTS_PARAMS)(
                    store.getState(),
                ).fulfilledTimeStamp ?? 0;
            const prodTsBefore =
                productsApi.endpoints.getProduct.select("prd-0001")(
                    store.getState(),
                ).fulfilledTimeStamp ?? 0;
            const catTsBefore =
                categoriesApi.endpoints.getCategories.select()(store.getState())
                    .fulfilledTimeStamp ?? 0;

            assert(
                prodsTsBefore > 0,
                "getProducts not yet fulfilled before mutation",
            );
            assert(
                prodTsBefore > 0,
                "getProduct not yet fulfilled before mutation",
            );
            assert(
                catTsBefore > 0,
                "getCategories not yet fulfilled before mutation",
            );

            const countAfterInit = {
                list: productsListCount,
                item: productItemCount,
                cat: categoriesCount,
            };

            // Dispatch receipt for prd-0001 (+5 kg)
            const result = await store.dispatch(
                receiptsApi.endpoints.postReceipt.initiate({
                    supplierId: "sup-001",
                    invoiceNumber: "RCP-EP-001",
                    date: "2026-10-15",
                    lines: [
                        {
                            productId: "prd-0001",
                            expectedQuantity: 5,
                            actualQuantity: 5,
                            batch: "B-EP-001",
                            expiryDate: "2027-04-01",
                        },
                    ],
                }),
            );

            expect(result.error).toBeUndefined();
            expect(result.data?.lineCount).toBe(1);

            // Wait for the two product queries to refetch (Product:LIST and Product:prd-0001 invalidated)
            await vi.waitFor(() => {
                const prodsTs =
                    productsApi.endpoints.getProducts.select(PRODUCTS_PARAMS)(
                        store.getState(),
                    ).fulfilledTimeStamp ?? 0;
                const prodTs =
                    productsApi.endpoints.getProduct.select("prd-0001")(
                        store.getState(),
                    ).fulfilledTimeStamp ?? 0;
                expect(prodsTs).toBeGreaterThan(prodsTsBefore);
                expect(prodTs).toBeGreaterThan(prodTsBefore);
            });

            // Requests were made for the product queries
            expect(productsListCount).toBeGreaterThan(countAfterInit.list);
            expect(productItemCount).toBeGreaterThan(countAfterInit.item);

            // Data reflects the new quantity (125.5 + 5 = 130.5)
            const prodsData = productsApi.endpoints.getProducts.select(
                PRODUCTS_PARAMS,
            )(store.getState()).data;
            const prodData = productsApi.endpoints.getProduct.select(
                "prd-0001",
            )(store.getState()).data;
            const prdInList = prodsData?.items.find((p) => p.id === "prd-0001");
            assert(
                prdInList !== undefined,
                "prd-0001 not found in product list after refetch",
            );
            expect(prdInList.quantity).toBe(130.5);
            expect(prodData?.quantity).toBe(130.5);

            // getCategories was NOT refetched
            const catTsAfter =
                categoriesApi.endpoints.getCategories.select()(store.getState())
                    .fulfilledTimeStamp ?? 0;
            expect(catTsAfter).toBe(catTsBefore);
            expect(categoriesCount).toBe(countAfterInit.cat);

            catSub.unsubscribe();
            prodsSub.unsubscribe();
            prodSub.unsubscribe();
        },
    );

    it(
        "409 DUPLICATE_INVOICE: mutation error has code DUPLICATE_INVOICE; " +
            "product list and movement list are NOT refetched",
        async () => {
            const store = makeStore();

            let productsListCount = 0;
            let movementsListCount = 0;
            server.use(
                http.get("/api/products", () => {
                    productsListCount++;
                }),
                http.get("/api/movements", () => {
                    movementsListCount++;
                }),
            );

            // Subscribe to getProducts so there is a live cache entry to potentially invalidate
            const prodsSub = store.dispatch(
                productsApi.endpoints.getProducts.initiate(PRODUCTS_PARAMS),
            );
            await prodsSub;

            const prodsTsBefore =
                productsApi.endpoints.getProducts.select(PRODUCTS_PARAMS)(
                    store.getState(),
                ).fulfilledTimeStamp ?? 0;
            assert(
                prodsTsBefore > 0,
                "getProducts not yet fulfilled before 409 mutation",
            );

            const countAfterInit = {
                list: productsListCount,
                movements: movementsListCount,
            };

            // Inject a 409 response so we can test the error path without
            // needing an actual duplicate in the db.
            server.use(
                http.post("/api/receipts", () =>
                    HttpResponse.json(
                        {
                            error: {
                                code: "DUPLICATE_INVOICE",
                                message:
                                    "Invoice already received for this supplier",
                                fields: {
                                    invoiceNumber:
                                        "Invoice already received for this supplier",
                                },
                            },
                        },
                        { status: 409 },
                    ),
                ),
            );

            const result = await store.dispatch(
                receiptsApi.endpoints.postReceipt.initiate({
                    supplierId: "sup-001",
                    invoiceNumber: "RCP-DUP-EP-001",
                    date: "2026-10-15",
                    lines: [
                        {
                            productId: "prd-0067",
                            expectedQuantity: 10,
                            actualQuantity: 10,
                        },
                    ],
                }),
            );

            // Mutation result carries the DUPLICATE_INVOICE error
            const err = result.error;
            expect(err).toBeDefined();
            assert(
                isApiErrorData(err),
                "Expected ApiErrorData with DUPLICATE_INVOICE code",
            );
            expect(err.code).toBe("DUPLICATE_INVOICE");

            // Give time for any potential async refetch to fire (none expected)
            await new Promise<void>((resolve) => setTimeout(resolve, 50));

            // Product list not refetched
            expect(productsListCount).toBe(countAfterInit.list);
            const prodsTsAfter =
                productsApi.endpoints.getProducts.select(PRODUCTS_PARAMS)(
                    store.getState(),
                ).fulfilledTimeStamp ?? 0;
            expect(prodsTsAfter).toBe(prodsTsBefore);

            // Movement list not refetched (never requested)
            expect(movementsListCount).toBe(0);

            prodsSub.unsubscribe();
        },
    );

    it(
        "route-level: discrepancy without note → 400 INVALID_BODY " +
            "fields[lines.0.discrepancyNote]",
        async () => {
            const store = makeStore();

            // discrepancyNote is optional in the ReceiptPayload TypeScript type
            // (the superRefine only adds runtime validation, not type constraints),
            // so this body compiles cleanly but receiptPayloadSchema rejects it.
            const result = await store.dispatch(
                receiptsApi.endpoints.postReceipt.initiate({
                    supplierId: "sup-001",
                    invoiceNumber: "RCP-ROUTE-SCHEMA-001",
                    date: "2026-10-15",
                    lines: [
                        {
                            productId: "prd-0067",
                            expectedQuantity: 20,
                            actualQuantity: 10,
                            // discrepancyNote absent; superRefine rejects because
                            // actualQuantity (10) !== expectedQuantity (20)
                        },
                    ],
                }),
            );

            const err = result.error;
            expect(err).toBeDefined();
            assert(
                isApiErrorData(err),
                "Expected ApiErrorData with INVALID_BODY code",
            );
            expect(err.code).toBe("INVALID_BODY");
            // The field key contains a literal dot; check it directly.
            expect(err.fields?.["lines.0.discrepancyNote"]).toBeDefined();
        },
    );
});
