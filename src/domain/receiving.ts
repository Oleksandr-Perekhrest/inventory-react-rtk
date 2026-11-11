// outsource dependencies
import * as z from "zod";

// local dependencies
import type { Product } from "./product";

export const RECEIVING_STEPS = ["document", "lines"] as const;
export type ReceivingStep = (typeof RECEIVING_STEPS)[number];

export const receiptLineDraftSchema = z.object({
    id: z.string(),
    productId: z.string(),
    expectedQuantity: z.number().nullable(),
    batch: z.string(),
    expiryDate: z.string(),
});
export type ReceiptLineDraft = z.infer<typeof receiptLineDraftSchema>;

export const receiptDraftSchema = z.object({
    step: z.enum(RECEIVING_STEPS),
    document: z.object({
        supplierId: z.string(),
        invoiceNumber: z.string(),
        date: z.string(),
    }),
    lines: z.array(receiptLineDraftSchema),
});
export type ReceiptDraft = z.infer<typeof receiptDraftSchema>;

export function createEmptyLine(id: string): ReceiptLineDraft {
    return {
        id,
        productId: "",
        expectedQuantity: null,
        batch: "",
        expiryDate: "",
    };
}

export function getNextStep(step: ReceivingStep): ReceivingStep | null {
    const index = RECEIVING_STEPS.indexOf(step);
    return RECEIVING_STEPS[index + 1] ?? null;
}

export function getPreviousStep(step: ReceivingStep): ReceivingStep | null {
    const index = RECEIVING_STEPS.indexOf(step);
    return index > 0 ? (RECEIVING_STEPS[index - 1] ?? null) : null;
}

export function createEmptyDraft(today: string, lineId: string): ReceiptDraft {
    return {
        step: "document",
        document: { supplierId: "", invoiceNumber: "", date: today },
        lines: [createEmptyLine(lineId)],
    };
}

export function createDocumentStepSchema({
    supplierExists,
    today,
}: {
    supplierExists: (id: string) => boolean;
    today: string;
}) {
    return z.object({
        supplierId: z
            .string()
            .min(1, "Select a supplier")
            .refine(supplierExists, "Supplier not found"),
        invoiceNumber: z
            .string()
            .trim()
            .min(1, "Enter an invoice number")
            .max(32, "Invoice number must be 32 characters or fewer"),
        date: z.iso
            .date()
            .refine((d) => d <= today, "Date cannot be in the future"),
    });
}

export function createLinesStepSchema({
    getProduct,
    documentDate,
}: {
    getProduct: (id: string) => Product | undefined;
    documentDate: string;
}) {
    return z.array(receiptLineDraftSchema).superRefine((lines, ctx) => {
        if (lines.length === 0) {
            ctx.addIssue({ code: "custom", message: "Add at least one line" });
            return;
        }

        const seen = new Map<string, string[]>();

        for (const [i, line] of lines.entries()) {
            if (!line.productId) {
                ctx.addIssue({
                    code: "custom",
                    path: [i, "productId"],
                    message: "Select a product",
                });
                continue;
            }

            const product = getProduct(line.productId);
            if (!product) {
                ctx.addIssue({
                    code: "custom",
                    path: [i, "productId"],
                    message: "Product not found",
                });
                continue;
            }

            validateQuantity(line.expectedQuantity, product, i, ctx);

            if (product.perishable) {
                validateBatch(line.batch, i, ctx);
                validateExpiryDate(line.expiryDate, documentDate, i, ctx);
            }

            const prevBatches = seen.get(line.productId) ?? [];
            if (product.perishable) {
                const batch = line.batch.trim();
                if (batch) {
                    if (prevBatches.includes(batch)) {
                        ctx.addIssue({
                            code: "custom",
                            path: [i, "productId"],
                            message: "Duplicate product and batch combination",
                        });
                    } else {
                        seen.set(line.productId, [...prevBatches, batch]);
                    }
                }
            } else {
                if (prevBatches.length > 0) {
                    ctx.addIssue({
                        code: "custom",
                        path: [i, "productId"],
                        message: "This product is already in the list",
                    });
                } else {
                    seen.set(line.productId, [""]);
                }
            }
        }
    });
}

function validateQuantity(
    qty: number | null,
    product: Product,
    i: number,
    ctx: z.RefinementCtx,
): void {
    if (qty === null) {
        ctx.addIssue({
            code: "custom",
            path: [i, "expectedQuantity"],
            message: "Enter a quantity greater than 0",
        });
        return;
    }
    if (qty <= 0) {
        ctx.addIssue({
            code: "custom",
            path: [i, "expectedQuantity"],
            message: "Enter a quantity greater than 0",
        });
        return;
    }
    if (qty > 100000) {
        ctx.addIssue({
            code: "custom",
            path: [i, "expectedQuantity"],
            message: "Quantity must be 100,000 or less",
        });
        return;
    }
    if (product.unit === "pcs" || product.unit === "box") {
        if (!Number.isInteger(qty)) {
            ctx.addIssue({
                code: "custom",
                path: [i, "expectedQuantity"],
                message: "Quantity must be a whole number",
            });
        }
    } else {
        if (Number(qty.toFixed(3)) !== qty) {
            ctx.addIssue({
                code: "custom",
                path: [i, "expectedQuantity"],
                message: "Quantity can have at most 3 decimal places",
            });
        }
    }
}

function validateBatch(batch: string, i: number, ctx: z.RefinementCtx): void {
    const trimmed = batch.trim();
    if (!trimmed) {
        ctx.addIssue({
            code: "custom",
            path: [i, "batch"],
            message: "Enter a batch number",
        });
        return;
    }
    if (trimmed.length > 32) {
        ctx.addIssue({
            code: "custom",
            path: [i, "batch"],
            message: "Batch must be 32 characters or fewer",
        });
    }
}

function validateExpiryDate(
    expiryDate: string,
    documentDate: string,
    i: number,
    ctx: z.RefinementCtx,
): void {
    if (!expiryDate) {
        ctx.addIssue({
            code: "custom",
            path: [i, "expiryDate"],
            message: "Enter an expiry date",
        });
        return;
    }
    if (!z.iso.date().safeParse(expiryDate).success) {
        ctx.addIssue({
            code: "custom",
            path: [i, "expiryDate"],
            message: "Enter a valid date",
        });
        return;
    }
    if (expiryDate <= documentDate) {
        ctx.addIssue({
            code: "custom",
            path: [i, "expiryDate"],
            message: "Expiry date must be after the document date",
        });
    }
}
