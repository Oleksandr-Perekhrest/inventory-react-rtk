// outsource dependencies
import * as z from "zod";

// local dependencies
import type { Db } from "../../db";
import { notFound, badRequest } from "../errors";
import { MovementTypeSchema } from "../../../domain";
import { paginate, paginationQuery } from "../pagination";
import type { Paginated, MovementListItem } from "../../../api/types";

export const movementsQuerySchema = z.object({
    ...paginationQuery,
    to: z.iso.date().optional(),
    from: z.iso.date().optional(),
    type: MovementTypeSchema.optional(),
    productId: z.string().optional(),
});

export function listMovements({
    db,
    query,
}: {
    db: Db;
    query: z.infer<typeof movementsQuerySchema>;
}): { body: Paginated<MovementListItem> } {
    const { page, pageSize, type, productId, from, to } = query;

    if (productId !== undefined) {
        const exists = db.products.some((p) => p.id === productId);
        if (!exists) throw notFound(`Product '${productId}' not found`);
    }

    if (from !== undefined && to !== undefined && from > to) {
        throw badRequest("INVALID_QUERY", "'from' must not be after 'to'", {
            from: "Must be on or before 'to'",
            to: "Must be on or after 'from'",
        });
    }

    let movements = [...db.movements];

    if (type !== undefined) {
        movements = movements.filter((m) => m.type === type);
    }
    if (productId !== undefined) {
        movements = movements.filter((m) => m.productId === productId);
    }
    if (from !== undefined) {
        movements = movements.filter((m) => m.date.slice(0, 10) >= from);
    }
    if (to !== undefined) {
        movements = movements.filter((m) => m.date.slice(0, 10) <= to);
    }

    movements.sort((a, b) => {
        const dateCmp = b.date.localeCompare(a.date);
        return dateCmp !== 0 ? dateCmp : b.id.localeCompare(a.id);
    });

    const paged = paginate(movements, page, pageSize);

    const productMap = new Map(db.products.map((p) => [p.id, p]));
    const supplierMap = new Map(db.suppliers.map((s) => [s.id, s]));

    const items: MovementListItem[] = paged.items.map((m) => {
        const p = productMap.get(m.productId)!;
        const s = m.supplierId ? (supplierMap.get(m.supplierId) ?? null) : null;
        return {
            ...m,
            product: { id: p.id, sku: p.sku, name: p.name, unit: p.unit },
            supplier: s ? { id: s.id, name: s.name } : null,
        };
    });

    return { body: { ...paged, items } };
}
