// outsource dependencies
import { it, assert, expect, describe, beforeEach } from "vitest";

// local dependencies
import { createDb } from "../../db";
import { ApiError } from "../errors";
import { postReceipt } from "./receipts";
import { createMemoryStorage } from "../../db/storage";

const FIXED_NOW = new Date("2026-11-06T07:00:00Z");

let storage = createMemoryStorage();
let db = createDb({ storage, now: () => FIXED_NOW });

describe("postReceipt controller", () => {
    beforeEach(() => {
        storage = createMemoryStorage();
        db = createDb({ storage, now: () => FIXED_NOW });
    });

    it("success: 2 lines (perishable with batch+expiry, non-perishable with discrepancy+note)", () => {
        const body = {
            supplierId: "sup-001",
            invoiceNumber: "RCP-SUCCESS-001",
            date: "2026-10-15",
            lines: [
                {
                    productId: "prd-0001",
                    expectedQuantity: 10,
                    actualQuantity: 10,
                    batch: "B2026A",
                    expiryDate: "2027-04-01",
                },
                {
                    productId: "prd-0067",
                    expectedQuantity: 20,
                    actualQuantity: 18,
                    discrepancyNote: "Two boxes arrived damaged",
                },
            ],
        };

        const movsBefore = db.movements.length;
        const result = postReceipt({ db, body });

        expect(result.status).toBe(201);
        expect(result.body.lineCount).toBe(2);
        expect(result.body.discrepancyCount).toBe(1);
        expect(result.body.movementIds).toHaveLength(2);
        expect(new Set(result.body.movementIds).size).toBe(2);

        const [id0, id1] = result.body.movementIds;
        const newMovs = [...db.movements].slice(movsBefore);
        expect(newMovs).toHaveLength(2);

        const mov0 = newMovs[0];
        const mov1 = newMovs[1];
        assert(mov0 !== undefined, "movement 0 missing");
        assert(mov1 !== undefined, "movement 1 missing");

        // Movement 0: perishable, no discrepancy
        expect(mov0.id).toBe(id0);
        expect(mov0.type).toBe("receipt");
        expect(mov0.productId).toBe("prd-0001");
        expect(mov0.quantity).toBe(10);
        expect(mov0.expectedQuantity).toBe(10);
        expect(mov0.batch).toBe("B2026A");
        expect(mov0.expiresAt).toBe("2027-04-01");
        expect(mov0.reference).toBe("RCP-SUCCESS-001");
        expect(mov0.supplierId).toBe("sup-001");
        expect(mov0.discrepancyNote).toBeUndefined();

        // Movement 1: non-perishable, discrepancy
        expect(mov1.id).toBe(id1);
        expect(mov1.type).toBe("receipt");
        expect(mov1.productId).toBe("prd-0067");
        expect(mov1.quantity).toBe(18);
        expect(mov1.expectedQuantity).toBe(20);
        expect(mov1.discrepancyNote).toBe("Two boxes arrived damaged");
        expect(mov1.reference).toBe("RCP-SUCCESS-001");
        expect(mov1.supplierId).toBe("sup-001");
        expect(mov1.batch).toBeUndefined();
        expect(mov1.expiresAt).toBeUndefined();

        // Product quantities
        const prd0001 = db.products.find((p) => p.id === "prd-0001");
        const prd0067 = db.products.find((p) => p.id === "prd-0067");
        const prd0068 = db.products.find((p) => p.id === "prd-0068");
        assert(prd0001 !== undefined, "prd-0001 missing");
        assert(prd0067 !== undefined, "prd-0067 missing");
        assert(prd0068 !== undefined, "prd-0068 missing");

        expect(prd0001.quantity).toBe(135.5); // 125.5 + 10
        expect(prd0067.quantity).toBe(298); // 280 + 18
        expect(prd0068.quantity).toBe(220); // unchanged (control)
    });

    it("line with actual 0 and note: movement quantity 0, product quantity unchanged", () => {
        const body = {
            supplierId: "sup-001",
            invoiceNumber: "RCP-ZERO-001",
            date: "2026-10-15",
            lines: [
                // positive line so the payload passes the "nothing to receive" rule
                {
                    productId: "prd-0067",
                    expectedQuantity: 20,
                    actualQuantity: 20,
                },
                // zero qty with note
                {
                    productId: "prd-0068",
                    expectedQuantity: 10,
                    actualQuantity: 0,
                    discrepancyNote: "Nothing arrived",
                },
            ],
        };

        const movsBefore = db.movements.length;
        postReceipt({ db, body });
        const newMovs = [...db.movements].slice(movsBefore);

        const zeroMov = newMovs.find((m) => m.productId === "prd-0068");
        assert(zeroMov !== undefined, "movement for prd-0068 missing");
        expect(zeroMov.quantity).toBe(0);
        expect(zeroMov.expectedQuantity).toBe(10);
        expect(zeroMov.discrepancyNote).toBe("Nothing arrived");

        const prd0068 = db.products.find((p) => p.id === "prd-0068");
        assert(prd0068 !== undefined);
        expect(prd0068.quantity).toBe(220); // 220 + 0 = 220
    });

    it("movement date keeps receipt date in local time", () => {
        const receiptDate = "2026-10-20";
        const body = {
            supplierId: "sup-001",
            invoiceNumber: "RCP-DATE-001",
            date: receiptDate,
            lines: [
                {
                    productId: "prd-0067",
                    expectedQuantity: 10,
                    actualQuantity: 10,
                },
            ],
        };

        const movsBefore = db.movements.length;
        postReceipt({ db, body });
        const newMovs = [...db.movements].slice(movsBefore);

        expect(newMovs).toHaveLength(1);
        const mov = newMovs[0];
        assert(mov !== undefined);

        const d = new Date(mov.date);
        expect(d.getFullYear()).toBe(2026);
        expect(d.getMonth() + 1).toBe(10); // October
        expect(d.getDate()).toBe(20);
    });

    describe("duplicate invoice check", () => {
        const basePayload = {
            supplierId: "sup-001",
            invoiceNumber: "RCP-DUP-001",
            date: "2026-10-15",
            lines: [
                {
                    productId: "prd-0067",
                    expectedQuantity: 10,
                    actualQuantity: 10,
                },
            ],
        };

        it("same invoice same supplier → 409 DUPLICATE_INVOICE; stock increased only once", () => {
            postReceipt({ db, body: basePayload });

            const qtyAfterFirst = db.products.find(
                (p) => p.id === "prd-0067",
            )?.quantity;
            assert(qtyAfterFirst !== undefined);
            expect(qtyAfterFirst).toBe(290); // 280 + 10

            let thrown: unknown;
            try {
                postReceipt({ db, body: basePayload });
            } catch (e) {
                thrown = e;
            }

            expect(thrown).toBeInstanceOf(ApiError);
            if (thrown instanceof ApiError) {
                expect(thrown.status).toBe(409);
                expect(thrown.code).toBe("DUPLICATE_INVOICE");
                expect(thrown.fields?.invoiceNumber).toBeDefined();
            }

            // stock was not increased a second time
            const qtyAfterSecond = db.products.find(
                (p) => p.id === "prd-0067",
            )?.quantity;
            expect(qtyAfterSecond).toBe(qtyAfterFirst);
        });

        it("same invoice different case → 409", () => {
            postReceipt({ db, body: basePayload });

            let thrown: unknown;
            try {
                postReceipt({
                    db,
                    body: { ...basePayload, invoiceNumber: "rcp-dup-001" },
                });
            } catch (e) {
                thrown = e;
            }

            expect(thrown).toBeInstanceOf(ApiError);
            if (thrown instanceof ApiError) {
                expect(thrown.status).toBe(409);
                expect(thrown.code).toBe("DUPLICATE_INVOICE");
            }
        });

        it("same invoice with surrounding spaces → 409", () => {
            postReceipt({ db, body: basePayload });

            let thrown: unknown;
            try {
                postReceipt({
                    db,
                    body: { ...basePayload, invoiceNumber: " RCP-DUP-001 " },
                });
            } catch (e) {
                thrown = e;
            }

            expect(thrown).toBeInstanceOf(ApiError);
            if (thrown instanceof ApiError) {
                expect(thrown.status).toBe(409);
                expect(thrown.code).toBe("DUPLICATE_INVOICE");
            }
        });

        it("same invoice from a different supplier → success (control)", () => {
            postReceipt({ db, body: basePayload });

            // Same invoiceNumber, different supplierId — not a duplicate
            const result = postReceipt({
                db,
                body: { ...basePayload, supplierId: "sup-002" },
            });
            expect(result.status).toBe(201);
        });
    });

    describe("400 validation errors leave db unchanged", () => {
        function throwFor(
            body: Parameters<typeof postReceipt>[0]["body"],
        ): unknown {
            let thrown: unknown;
            try {
                postReceipt({ db, body });
            } catch (e) {
                thrown = e;
            }
            return thrown;
        }

        it("unknown supplier → 400 INVALID_BODY fields.supplierId", () => {
            const beforeProds = structuredClone([...db.products]);
            const beforeMovs = structuredClone([...db.movements]);

            const thrown = throwFor({
                supplierId: "sup-nonexistent",
                invoiceNumber: "RCP-ERR-SUP",
                date: "2026-10-15",
                lines: [
                    {
                        productId: "prd-0067",
                        expectedQuantity: 10,
                        actualQuantity: 10,
                    },
                ],
            });

            expect(thrown).toBeInstanceOf(ApiError);
            if (thrown instanceof ApiError) {
                expect(thrown.status).toBe(400);
                expect(thrown.code).toBe("INVALID_BODY");
                expect(thrown.fields?.supplierId).toBeDefined();
            }
            expect([...db.products]).toEqual(beforeProds);
            expect([...db.movements]).toEqual(beforeMovs);
        });

        it("unknown product on line 1 → 400 INVALID_BODY fields[lines.1.productId]", () => {
            const beforeProds = structuredClone([...db.products]);
            const beforeMovs = structuredClone([...db.movements]);

            const thrown = throwFor({
                supplierId: "sup-001",
                invoiceNumber: "RCP-ERR-PRD",
                date: "2026-10-15",
                lines: [
                    {
                        productId: "prd-0067",
                        expectedQuantity: 10,
                        actualQuantity: 10,
                    },
                    {
                        productId: "prd-nonexistent",
                        expectedQuantity: 5,
                        actualQuantity: 5,
                    },
                ],
            });

            expect(thrown).toBeInstanceOf(ApiError);
            if (thrown instanceof ApiError) {
                expect(thrown.status).toBe(400);
                expect(thrown.code).toBe("INVALID_BODY");
                expect(thrown.fields?.["lines.1.productId"]).toBeDefined();
            }
            expect([...db.products]).toEqual(beforeProds);
            expect([...db.movements]).toEqual(beforeMovs);
        });

        it("perishable without batch → 400 INVALID_BODY fields[lines.0.batch]", () => {
            const beforeProds = structuredClone([...db.products]);
            const beforeMovs = structuredClone([...db.movements]);

            // prd-0001 is perishable; omit batch → controller error
            const thrown = throwFor({
                supplierId: "sup-001",
                invoiceNumber: "RCP-ERR-BATCH",
                date: "2026-10-15",
                lines: [
                    {
                        productId: "prd-0001",
                        expectedQuantity: 10,
                        actualQuantity: 10,
                        expiryDate: "2027-04-01",
                    },
                ],
            });

            expect(thrown).toBeInstanceOf(ApiError);
            if (thrown instanceof ApiError) {
                expect(thrown.status).toBe(400);
                expect(thrown.code).toBe("INVALID_BODY");
                expect(thrown.fields?.["lines.0.batch"]).toBeDefined();
            }
            expect([...db.products]).toEqual(beforeProds);
            expect([...db.movements]).toEqual(beforeMovs);
        });

        it("non-perishable with batch → 400 INVALID_BODY fields[lines.0.batch]", () => {
            const beforeProds = structuredClone([...db.products]);
            const beforeMovs = structuredClone([...db.movements]);

            // prd-0067 is non-perishable; providing batch → controller error
            const thrown = throwFor({
                supplierId: "sup-001",
                invoiceNumber: "RCP-ERR-NPBATCH",
                date: "2026-10-15",
                lines: [
                    {
                        productId: "prd-0067",
                        expectedQuantity: 10,
                        actualQuantity: 10,
                        batch: "BATCH-001",
                    },
                ],
            });

            expect(thrown).toBeInstanceOf(ApiError);
            if (thrown instanceof ApiError) {
                expect(thrown.status).toBe(400);
                expect(thrown.code).toBe("INVALID_BODY");
                expect(thrown.fields?.["lines.0.batch"]).toBeDefined();
            }
            expect([...db.products]).toEqual(beforeProds);
            expect([...db.movements]).toEqual(beforeMovs);
        });

        it("pcs quantity 1.5 → 400 INVALID_BODY fields[lines.0.expectedQuantity]", () => {
            const beforeProds = structuredClone([...db.products]);
            const beforeMovs = structuredClone([...db.movements]);

            // prd-0067 has unit "pcs"; 1.5 is not a whole number → controller error
            const thrown = throwFor({
                supplierId: "sup-001",
                invoiceNumber: "RCP-ERR-PREC",
                date: "2026-10-15",
                lines: [
                    {
                        productId: "prd-0067",
                        expectedQuantity: 1.5,
                        actualQuantity: 1.5,
                    },
                ],
            });

            expect(thrown).toBeInstanceOf(ApiError);
            if (thrown instanceof ApiError) {
                expect(thrown.status).toBe(400);
                expect(thrown.code).toBe("INVALID_BODY");
                expect(
                    thrown.fields?.["lines.0.expectedQuantity"],
                ).toBeDefined();
            }
            expect([...db.products]).toEqual(beforeProds);
            expect([...db.movements]).toEqual(beforeMovs);
        });
    });
});

// ---------------------------------------------------------------------------
// Atomicity note
// ---------------------------------------------------------------------------
// db.test.ts already contains "rolls back when fn throws, rethrowing the error
// and leaving storage unchanged" which proves that any throw inside
// transaction() leaves the db unchanged. Because postReceipt wraps all writes
// in db.transaction(), every error path (400, 409) automatically satisfies
// atomicity. No new test is added here.
//
// Route-level schema validation test (discrepancy without note → 400) lives
// in src/api/endpoints/receipts.test.ts where the MSW server is established
// at the top level and all handlers are confirmed to be reachable.
// ---------------------------------------------------------------------------
