// outsource dependencies
import { it, expect, describe } from "vitest";

// local dependencies
import { formatUnit } from "./product";
import type { Product } from "./product";
import {
    getNextStep,
    isDraftEmpty,
    createEmptyLine,
    getPreviousStep,
    createEmptyDraft,
    type ReceiptDraft,
    createLinesStepSchema,
    createDocumentStepSchema,
} from "./receiving";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeProduct(overrides: Partial<Product> = {}): Product {
    return {
        id: "prod-1",
        sku: "PROD-001",
        name: "Widget",
        categoryId: "cat-1",
        unit: "pcs",
        price: 100,
        quantity: 50,
        minQuantity: 5,
        perishable: false,
        ...overrides,
    };
}

function makeLines(
    overrides: Partial<ReturnType<typeof createEmptyLine>> = {},
): ReturnType<typeof createEmptyLine>[] {
    return [{ ...createEmptyLine("line-1"), ...overrides }];
}

function issuesOf(result: {
    success: false;
    error: { issues: { path: PropertyKey[]; message: string }[] };
}) {
    return result.error.issues;
}

// ---------------------------------------------------------------------------
// createEmptyDraft / createEmptyLine
// ---------------------------------------------------------------------------

describe("createEmptyDraft", () => {
    it("returns a deterministic draft for given inputs", () => {
        expect(createEmptyDraft("2026-11-12", "line-id-1")).toEqual({
            step: "document",
            document: { supplierId: "", invoiceNumber: "", date: "2026-11-12" },
            lines: [
                {
                    id: "line-id-1",
                    productId: "",
                    expectedQuantity: null,
                    batch: "",
                    expiryDate: "",
                },
            ],
        });
    });
});

describe("createEmptyLine", () => {
    it("returns a deterministic line for a given id", () => {
        expect(createEmptyLine("abc")).toEqual({
            id: "abc",
            productId: "",
            expectedQuantity: null,
            batch: "",
            expiryDate: "",
        });
    });
});

// ---------------------------------------------------------------------------
// getNextStep / getPreviousStep
// ---------------------------------------------------------------------------

describe("getNextStep", () => {
    it("returns lines after document", () => {
        expect(getNextStep("document")).toBe("lines");
    });

    it("returns reconciliation after lines", () => {
        expect(getNextStep("lines")).toBe("reconciliation");
    });
});

describe("getPreviousStep", () => {
    it("returns null before document (first step)", () => {
        expect(getPreviousStep("document")).toBeNull();
    });

    it("returns document before lines", () => {
        expect(getPreviousStep("lines")).toBe("document");
    });
});

// ---------------------------------------------------------------------------
// isDraftEmpty
// ---------------------------------------------------------------------------

describe("isDraftEmpty", () => {
    const emptyDraft: ReceiptDraft = createEmptyDraft("2026-11-12", "l1");

    it("returns true for a freshly created draft", () => {
        expect(isDraftEmpty(emptyDraft)).toBe(true);
    });

    it("returns false when supplierId is set", () => {
        expect(
            isDraftEmpty({
                ...emptyDraft,
                document: { ...emptyDraft.document, supplierId: "sup-1" },
            }),
        ).toBe(false);
    });

    it("returns false when invoiceNumber is set", () => {
        expect(
            isDraftEmpty({
                ...emptyDraft,
                document: { ...emptyDraft.document, invoiceNumber: "INV-001" },
            }),
        ).toBe(false);
    });

    it("returns false when a line has productId", () => {
        const draft: ReceiptDraft = {
            ...emptyDraft,
            lines: makeLines({ productId: "prod-1" }),
        };
        expect(isDraftEmpty(draft)).toBe(false);
    });

    it("returns false when a line has expectedQuantity", () => {
        const draft: ReceiptDraft = {
            ...emptyDraft,
            lines: makeLines({ expectedQuantity: 5 }),
        };
        expect(isDraftEmpty(draft)).toBe(false);
    });

    it("returns false when a line has batch", () => {
        const draft: ReceiptDraft = {
            ...emptyDraft,
            lines: makeLines({ batch: "B001" }),
        };
        expect(isDraftEmpty(draft)).toBe(false);
    });

    it("returns false when a line has expiryDate", () => {
        const draft: ReceiptDraft = {
            ...emptyDraft,
            lines: makeLines({ expiryDate: "2027-01-01" }),
        };
        expect(isDraftEmpty(draft)).toBe(false);
    });

    it("treats whitespace-only supplierId as empty", () => {
        expect(
            isDraftEmpty({
                ...emptyDraft,
                document: { ...emptyDraft.document, supplierId: "   " },
            }),
        ).toBe(true);
    });

    it("treats whitespace-only invoiceNumber as empty", () => {
        expect(
            isDraftEmpty({
                ...emptyDraft,
                document: { ...emptyDraft.document, invoiceNumber: "  " },
            }),
        ).toBe(true);
    });

    it("ignores step and date when checking emptiness", () => {
        const draft: ReceiptDraft = {
            ...emptyDraft,
            step: "lines",
            document: { ...emptyDraft.document, date: "2026-01-01" },
        };
        expect(isDraftEmpty(draft)).toBe(true);
    });
});

// ---------------------------------------------------------------------------
// createDocumentStepSchema
// ---------------------------------------------------------------------------

describe("createDocumentStepSchema", () => {
    const today = "2026-11-12";
    const supplierExists = (id: string) => id === "sup-1";
    const schema = createDocumentStepSchema({ supplierExists, today });

    const validDoc = {
        supplierId: "sup-1",
        invoiceNumber: "INV-001",
        date: "2026-11-12",
    };

    it("accepts a valid document", () => {
        expect(schema.safeParse(validDoc).success).toBe(true);
    });

    it("rejects missing supplier (empty string)", () => {
        const result = schema.safeParse({ ...validDoc, supplierId: "" });
        expect(result.success).toBe(false);
        if (!result.success) {
            expect(
                issuesOf(result).some((i) => i.path[0] === "supplierId"),
            ).toBe(true);
        }
    });

    it("rejects unknown supplier", () => {
        const result = schema.safeParse({
            ...validDoc,
            supplierId: "sup-unknown",
        });
        expect(result.success).toBe(false);
        if (!result.success) {
            expect(
                issuesOf(result).some((i) => i.path[0] === "supplierId"),
            ).toBe(true);
        }
    });

    it("rejects empty invoice number", () => {
        const result = schema.safeParse({ ...validDoc, invoiceNumber: "" });
        expect(result.success).toBe(false);
        if (!result.success) {
            expect(
                issuesOf(result).some((i) => i.path[0] === "invoiceNumber"),
            ).toBe(true);
        }
    });

    it("rejects whitespace-only invoice number", () => {
        const result = schema.safeParse({ ...validDoc, invoiceNumber: "   " });
        expect(result.success).toBe(false);
        if (!result.success) {
            expect(
                issuesOf(result).some((i) => i.path[0] === "invoiceNumber"),
            ).toBe(true);
        }
    });

    it("rejects invoice number of 33 characters", () => {
        const result = schema.safeParse({
            ...validDoc,
            invoiceNumber: "A".repeat(33),
        });
        expect(result.success).toBe(false);
        if (!result.success) {
            expect(
                issuesOf(result).some((i) => i.path[0] === "invoiceNumber"),
            ).toBe(true);
        }
    });

    it("accepts invoice number of exactly 32 characters", () => {
        expect(
            schema.safeParse({ ...validDoc, invoiceNumber: "A".repeat(32) })
                .success,
        ).toBe(true);
    });

    it("rejects an invalid date string", () => {
        const result = schema.safeParse({ ...validDoc, date: "not-a-date" });
        expect(result.success).toBe(false);
        if (!result.success) {
            expect(issuesOf(result).some((i) => i.path[0] === "date")).toBe(
                true,
            );
        }
    });

    it("rejects a future date (today + 1 day)", () => {
        const result = schema.safeParse({ ...validDoc, date: "2026-11-13" });
        expect(result.success).toBe(false);
        if (!result.success) {
            const dateIssue = issuesOf(result).find(
                (i) => i.path[0] === "date",
            );
            expect(dateIssue).toBeDefined();
            expect(dateIssue?.message).toMatch(/future/i);
        }
    });

    it("accepts today's date as the document date", () => {
        expect(schema.safeParse({ ...validDoc, date: today }).success).toBe(
            true,
        );
    });
});

// ---------------------------------------------------------------------------
// createLinesStepSchema
// ---------------------------------------------------------------------------

describe("createLinesStepSchema", () => {
    const pcs = makeProduct({ id: "pcs-1", unit: "pcs", perishable: false });
    const kg = makeProduct({ id: "kg-1", unit: "kg", perishable: false });
    const liquid = makeProduct({ id: "l-1", unit: "l", perishable: false });
    const box = makeProduct({ id: "box-1", unit: "box", perishable: false });
    const perishable = makeProduct({
        id: "peri-1",
        unit: "pcs",
        perishable: true,
    });

    const products: Record<string, Product> = {
        [pcs.id]: pcs,
        [kg.id]: kg,
        [liquid.id]: liquid,
        [box.id]: box,
        [perishable.id]: perishable,
    };

    const getProduct = (id: string) => products[id];
    const documentDate = "2026-11-12";
    const schema = createLinesStepSchema({ getProduct, documentDate });

    function line(overrides: Partial<ReturnType<typeof createEmptyLine>> = {}) {
        return { ...createEmptyLine("line-1"), ...overrides };
    }

    it("rejects empty lines array", () => {
        const result = schema.safeParse([]);
        expect(result.success).toBe(false);
        if (!result.success) {
            expect(
                issuesOf(result).some(
                    (i) => i.message === "Add at least one line",
                ),
            ).toBe(true);
        }
    });

    it("rejects line with no product selected", () => {
        const result = schema.safeParse([line()]);
        expect(result.success).toBe(false);
        if (!result.success) {
            const issue = issuesOf(result).find(
                (i) => i.path[0] === 0 && i.path[1] === "productId",
            );
            expect(issue?.message).toBe("Select a product");
        }
    });

    it("rejects line with unknown product", () => {
        const result = schema.safeParse([line({ productId: "unknown" })]);
        expect(result.success).toBe(false);
        if (!result.success) {
            const issue = issuesOf(result).find(
                (i) => i.path[0] === 0 && i.path[1] === "productId",
            );
            expect(issue?.message).toBe("Product not found");
        }
    });

    it("rejects null quantity", () => {
        const result = schema.safeParse([
            line({ productId: pcs.id, expectedQuantity: null }),
        ]);
        expect(result.success).toBe(false);
        if (!result.success) {
            const issue = issuesOf(result).find(
                (i) => i.path[0] === 0 && i.path[1] === "expectedQuantity",
            );
            expect(issue).toBeDefined();
        }
    });

    it("rejects zero quantity", () => {
        const result = schema.safeParse([
            line({ productId: pcs.id, expectedQuantity: 0 }),
        ]);
        expect(result.success).toBe(false);
        if (!result.success) {
            const issue = issuesOf(result).find(
                (i) => i.path[0] === 0 && i.path[1] === "expectedQuantity",
            );
            expect(issue).toBeDefined();
        }
    });

    it("rejects negative quantity", () => {
        const result = schema.safeParse([
            line({ productId: pcs.id, expectedQuantity: -1 }),
        ]);
        expect(result.success).toBe(false);
        if (!result.success) {
            const issue = issuesOf(result).find(
                (i) => i.path[0] === 0 && i.path[1] === "expectedQuantity",
            );
            expect(issue).toBeDefined();
        }
    });

    it("rejects quantity > 100000", () => {
        const result = schema.safeParse([
            line({ productId: pcs.id, expectedQuantity: 100001 }),
        ]);
        expect(result.success).toBe(false);
        if (!result.success) {
            const issue = issuesOf(result).find(
                (i) => i.path[0] === 0 && i.path[1] === "expectedQuantity",
            );
            expect(issue?.message).toMatch(/100,000/);
        }
    });

    it("pcs: rejects fractional quantity 1.5", () => {
        const result = schema.safeParse([
            line({ productId: pcs.id, expectedQuantity: 1.5 }),
        ]);
        expect(result.success).toBe(false);
        if (!result.success) {
            const issue = issuesOf(result).find(
                (i) => i.path[0] === 0 && i.path[1] === "expectedQuantity",
            );
            expect(issue?.message).toMatch(/whole number/i);
        }
    });

    it("box: rejects fractional quantity 1.5", () => {
        const result = schema.safeParse([
            line({ productId: box.id, expectedQuantity: 1.5 }),
        ]);
        expect(result.success).toBe(false);
        if (!result.success) {
            const issue = issuesOf(result).find(
                (i) => i.path[0] === 0 && i.path[1] === "expectedQuantity",
            );
            expect(issue?.message).toMatch(/whole number/i);
        }
    });

    it("kg: accepts 3-decimal quantity 1.123", () => {
        const result = schema.safeParse([
            line({ productId: kg.id, expectedQuantity: 1.123 }),
        ]);
        expect(result.success).toBe(true);
    });

    it("kg: rejects 4-decimal quantity 1.1234", () => {
        const result = schema.safeParse([
            line({ productId: kg.id, expectedQuantity: 1.1234 }),
        ]);
        expect(result.success).toBe(false);
        if (!result.success) {
            const issue = issuesOf(result).find(
                (i) => i.path[0] === 0 && i.path[1] === "expectedQuantity",
            );
            expect(issue?.message).toMatch(/3 decimal/i);
        }
    });

    it("l: accepts 3-decimal quantity 1.123", () => {
        const result = schema.safeParse([
            line({ productId: liquid.id, expectedQuantity: 1.123 }),
        ]);
        expect(result.success).toBe(true);
    });

    it("regression: l rejects 1e-7 (more than 3 decimal places)", () => {
        const result = schema.safeParse([
            line({ productId: liquid.id, expectedQuantity: 1e-7 }),
        ]);
        expect(result.success).toBe(false);
        if (!result.success) {
            const issue = issuesOf(result).find(
                (i) => i.path[0] === 0 && i.path[1] === "expectedQuantity",
            );
            expect(issue?.message).toMatch(/3 decimal/i);
        }
    });

    it("perishable: requires batch", () => {
        const result = schema.safeParse([
            line({
                productId: perishable.id,
                expectedQuantity: 1,
                batch: "",
                expiryDate: "2027-01-01",
            }),
        ]);
        expect(result.success).toBe(false);
        if (!result.success) {
            const issue = issuesOf(result).find(
                (i) => i.path[0] === 0 && i.path[1] === "batch",
            );
            expect(issue).toBeDefined();
        }
    });

    it("perishable: requires expiryDate", () => {
        const result = schema.safeParse([
            line({
                productId: perishable.id,
                expectedQuantity: 1,
                batch: "B001",
                expiryDate: "",
            }),
        ]);
        expect(result.success).toBe(false);
        if (!result.success) {
            const issue = issuesOf(result).find(
                (i) => i.path[0] === 0 && i.path[1] === "expiryDate",
            );
            expect(issue).toBeDefined();
        }
    });

    it("perishable: rejects expiryDate equal to documentDate", () => {
        const result = schema.safeParse([
            line({
                productId: perishable.id,
                expectedQuantity: 1,
                batch: "B001",
                expiryDate: "2026-11-12",
            }),
        ]);
        expect(result.success).toBe(false);
        if (!result.success) {
            const issue = issuesOf(result).find(
                (i) => i.path[0] === 0 && i.path[1] === "expiryDate",
            );
            expect(issue?.message).toMatch(/after/i);
        }
    });

    it("perishable: accepts expiryDate one day after documentDate", () => {
        const result = schema.safeParse([
            line({
                productId: perishable.id,
                expectedQuantity: 1,
                batch: "B001",
                expiryDate: "2026-11-13",
            }),
        ]);
        expect(result.success).toBe(true);
    });

    it("non-perishable: ignores batch and expiryDate", () => {
        const result = schema.safeParse([
            line({ productId: pcs.id, expectedQuantity: 5 }),
        ]);
        expect(result.success).toBe(true);
    });

    it("duplicate non-perishable product: error on the later line", () => {
        const lines = [
            {
                ...createEmptyLine("l1"),
                productId: pcs.id,
                expectedQuantity: 1,
            },
            {
                ...createEmptyLine("l2"),
                productId: pcs.id,
                expectedQuantity: 2,
            },
        ];
        const result = schema.safeParse(lines);
        expect(result.success).toBe(false);
        if (!result.success) {
            const issue = issuesOf(result).find(
                (i) => i.path[0] === 1 && i.path[1] === "productId",
            );
            expect(issue?.message).toMatch(/already in the list/i);
        }
    });

    it("perishable same product different batches: ok", () => {
        const lines = [
            {
                ...createEmptyLine("l1"),
                productId: perishable.id,
                expectedQuantity: 1,
                batch: "B001",
                expiryDate: "2026-11-13",
            },
            {
                ...createEmptyLine("l2"),
                productId: perishable.id,
                expectedQuantity: 2,
                batch: "B002",
                expiryDate: "2026-11-14",
            },
        ];
        expect(schema.safeParse(lines).success).toBe(true);
    });

    it("perishable same product same batch: error on the later line", () => {
        const lines = [
            {
                ...createEmptyLine("l1"),
                productId: perishable.id,
                expectedQuantity: 1,
                batch: "B001",
                expiryDate: "2026-11-13",
            },
            {
                ...createEmptyLine("l2"),
                productId: perishable.id,
                expectedQuantity: 2,
                batch: "B001",
                expiryDate: "2026-11-14",
            },
        ];
        const result = schema.safeParse(lines);
        expect(result.success).toBe(false);
        if (!result.success) {
            const issue = issuesOf(result).find(
                (i) => i.path[0] === 1 && i.path[1] === "productId",
            );
            expect(issue?.message).toMatch(/duplicate/i);
        }
    });

    it("regression: perishable duplicates with empty batches produce only 'batch required' errors, not duplicate error", () => {
        const lines = [
            {
                ...createEmptyLine("l1"),
                productId: perishable.id,
                expectedQuantity: 1,
                batch: "",
                expiryDate: "2026-11-13",
            },
            {
                ...createEmptyLine("l2"),
                productId: perishable.id,
                expectedQuantity: 2,
                batch: "",
                expiryDate: "2026-11-14",
            },
        ];
        const result = schema.safeParse(lines);
        expect(result.success).toBe(false);
        if (!result.success) {
            const issues = issuesOf(result);
            const duplicateIssues = issues.filter((i) =>
                i.message.toLowerCase().includes("duplicate"),
            );
            expect(duplicateIssues).toHaveLength(0);
            const batchIssues = issues.filter((i) => i.path[1] === "batch");
            expect(batchIssues.length).toBeGreaterThan(0);
        }
    });
});

// ---------------------------------------------------------------------------
// formatUnit
// ---------------------------------------------------------------------------

describe("formatUnit", () => {
    it("formats 'l' as 'L'", () => {
        expect(formatUnit("l")).toBe("L");
    });

    it("leaves 'pcs' unchanged", () => {
        expect(formatUnit("pcs")).toBe("pcs");
    });

    it("leaves 'kg' unchanged", () => {
        expect(formatUnit("kg")).toBe("kg");
    });

    it("leaves 'box' unchanged", () => {
        expect(formatUnit("box")).toBe("box");
    });
});
