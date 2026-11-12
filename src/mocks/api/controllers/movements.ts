// local dependencies
import type { Db } from "../../db";
import { paginate } from "../pagination";
import { notFound, badRequest } from "../errors";
import { toLocalIsoDate } from "../../../lib/date";
import type { MovementsQuery } from "../../../api/queries";
import type { Paginated, MovementListItem } from "../../../api/types";

export function listMovements({
    db,
    query,
}: {
    db: Db;
    query: MovementsQuery;
}): { body: Paginated<MovementListItem> } {
    const { page, pageSize, type, productId, from, to, order } = query;

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
    if (from !== undefined || to !== undefined) {
        // the mock runs in the user's browser, so the local time zone is the user's;
        // a real backend would need the client's time zone.
        movements = movements.filter((m) => {
            const localDate = toLocalIsoDate(new Date(m.date));
            return (
                (from === undefined || localDate >= from) &&
                (to === undefined || localDate <= to)
            );
        });
    }

    movements.sort((a, b) => {
        const sign = order === "asc" ? 1 : -1;
        const dateCmp = a.date.localeCompare(b.date);
        if (dateCmp !== 0) return sign * dateCmp;
        return sign * a.id.localeCompare(b.id);
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
