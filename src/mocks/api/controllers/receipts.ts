// local dependencies
import type { Db } from "../../db";
import { MovementSchema } from "../../../domain";
import { ApiError, badRequest } from "../errors";
import type { ReceiptResponse } from "../../../api/types";
import { unitPrecisionError } from "../../../domain/receiving";
import type { ReceiptPayload } from "../../../domain/receiving";

export function postReceipt({ db, body }: { db: Db; body: ReceiptPayload }): {
    status: 201;
    body: ReceiptResponse;
} {
    const now = db.now();

    return db.transaction((draft) => {
        // 1. Supplier must exist
        const supplier = draft.suppliers.find((s) => s.id === body.supplierId);
        if (!supplier) {
            throw badRequest("INVALID_BODY", "Supplier not found", {
                supplierId: "Supplier not found",
            });
        }

        // 2. Every productId must exist
        const fieldErrors: Record<string, string> = {};
        const resolvedProducts = body.lines.map((line, i) => {
            const p = draft.products.find((p) => p.id === line.productId);
            if (!p) fieldErrors[`lines.${i}.productId`] = "Product not found";
            return p;
        });
        if (Object.keys(fieldErrors).length > 0) {
            throw badRequest(
                "INVALID_BODY",
                "Invalid request body",
                fieldErrors,
            );
        }

        // 3. Unit precision + perishable constraints per line
        for (const [i, line] of body.lines.entries()) {
            const product = resolvedProducts[i];
            if (product === undefined) continue;

            const expErr = unitPrecisionError(
                line.expectedQuantity,
                product.unit,
            );
            if (expErr !== null)
                fieldErrors[`lines.${i}.expectedQuantity`] = expErr;

            const actErr = unitPrecisionError(
                line.actualQuantity,
                product.unit,
            );
            if (actErr !== null)
                fieldErrors[`lines.${i}.actualQuantity`] = actErr;

            if (product.perishable) {
                if (line.batch === undefined)
                    fieldErrors[`lines.${i}.batch`] =
                        "batch is required for perishable products";
                if (line.expiryDate === undefined)
                    fieldErrors[`lines.${i}.expiryDate`] =
                        "expiryDate is required for perishable products";
            } else {
                if (line.batch !== undefined)
                    fieldErrors[`lines.${i}.batch`] =
                        "batch must not be set for non-perishable products";
                if (line.expiryDate !== undefined)
                    fieldErrors[`lines.${i}.expiryDate`] =
                        "expiryDate must not be set for non-perishable products";
            }
        }
        if (Object.keys(fieldErrors).length > 0) {
            throw badRequest(
                "INVALID_BODY",
                "Invalid request body",
                fieldErrors,
            );
        }

        // 4. Duplicate invoice check
        const invoiceNorm = body.invoiceNumber.trim().toLowerCase();
        const isDuplicate = draft.movements.some(
            (m) =>
                m.type === "receipt" &&
                m.supplierId === body.supplierId &&
                m.reference.trim().toLowerCase() === invoiceNorm,
        );
        if (isDuplicate) {
            throw new ApiError(
                409,
                "DUPLICATE_INVOICE",
                `Invoice ${body.invoiceNumber} from this supplier has already been received`,
                {
                    invoiceNumber: "Invoice already received for this supplier",
                },
            );
        }

        // 5. Generate movement IDs starting after the current maximum
        const maxIdNum = draft.movements.reduce((max, m) => {
            const n = parseInt(m.id.replace("mov-", ""), 10);
            return isNaN(n) ? max : Math.max(max, n);
        }, 0);

        const timeStr = now.toISOString().slice(10);
        const movDate = body.date + timeStr;

        const movementIds: string[] = [];
        let discrepancyCount = 0;

        // 6. Create movements and update product quantities
        for (const [i, line] of body.lines.entries()) {
            const id = `mov-${String(maxIdNum + i + 1).padStart(5, "0")}`;
            movementIds.push(id);

            const mov = {
                id,
                type: "receipt" as const,
                productId: line.productId,
                quantity: line.actualQuantity,
                date: movDate,
                reference: body.invoiceNumber,
                supplierId: body.supplierId,
                expectedQuantity: line.expectedQuantity,
                ...(line.batch !== undefined ? { batch: line.batch } : {}),
                ...(line.expiryDate !== undefined
                    ? { expiresAt: line.expiryDate }
                    : {}),
                ...(line.discrepancyNote !== undefined
                    ? { discrepancyNote: line.discrepancyNote }
                    : {}),
            };

            const parsed = MovementSchema.safeParse(mov);
            if (!parsed.success) {
                throw new Error(
                    `Line ${i}: movement schema validation failed: ${parsed.error.message}`,
                );
            }

            draft.movements.push(parsed.data);

            const product = resolvedProducts[i];
            if (product !== undefined) {
                product.quantity += line.actualQuantity;
            }

            if (line.actualQuantity !== line.expectedQuantity)
                discrepancyCount++;
        }

        return {
            status: 201 as const,
            body: {
                invoiceNumber: body.invoiceNumber,
                supplierId: body.supplierId,
                date: body.date,
                movementIds,
                lineCount: body.lines.length,
                discrepancyCount,
            },
        };
    });
}
