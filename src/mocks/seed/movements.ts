// local dependencies
import { makeRng } from "./random";
import type { Product, Category, Movement, Supplier } from "../../domain";

interface GenerateMovementsParams {
    products: Product[];
    suppliers: Supplier[];
    categories: Category[];
    now: Date;
    seed: number;
}

// 0=Sun, 1=Mon, 2=Tue, 3=Wed, 4=Thu, 5=Fri, 6=Sat
const SUPPLIER_DELIVERY_DAYS: Record<string, number[]> = {
    "sup-001": [1, 3, 5],
    "sup-002": [1, 4],
    "sup-003": [2, 5],
    "sup-004": [1, 3, 5],
    "sup-005": [2, 4],
    "sup-006": [1, 5],
    "sup-007": [3],
    "sup-008": [2, 4],
};

const CATEGORY_SUPPLIER: Record<string, string> = {
    "cat-dairy": "sup-002",
    "cat-meat": "sup-001",
    "cat-fish-seafood": "sup-003",
    "cat-bakery": "sup-004",
    "cat-beverages": "sup-005",
    "cat-canned-dry": "sup-006",
    "cat-oils-condiments": "sup-006",
    "cat-food": "sup-006",
    "cat-packaging": "sup-008",
    "cat-cleaning": "sup-007",
    "cat-frozen": "sup-001",
};

// Shelf life in days; ancestor fallback applies
const SHELF_LIFE: Record<string, number> = {
    "cat-fish-seafood": 5,
    "cat-bread": 4,
    "cat-pastry": 4,
    "cat-fresh-meat": 10,
    "cat-processed-meat": 30,
    "cat-meat": 10,
    "cat-milk-cream": 21,
    "cat-butter-yogurt": 21,
    "cat-dairy": 21,
    "cat-soft-cheese": 30,
    "cat-hard-cheese": 120,
    "cat-cheese": 60,
    "cat-juices": 60,
    "cat-beverages": 365,
};

const DAY_MS = 86_400_000;
const WORK_START_MS = 8 * 3_600_000; // 08:00 UTC
const WORK_END_MS = 17 * 3_600_000; // 17:00 UTC exclusive (last valid minute 16:59)

function resolveByAncestor(
    categoryId: string,
    map: Record<string, string | number>,
    catById: Map<string, Category>,
): string | number | undefined {
    let id: string | null = categoryId;
    while (id !== null) {
        if (map[id] !== undefined) return map[id];
        const cat = catById.get(id);
        if (!cat) return undefined;
        id = cat.parentId;
    }
    return undefined;
}

function nextDeliveryDay(fromMs: number, deliveryDays: number[]): number {
    let ms = fromMs;
    for (let i = 0; i < 7; i++) {
        const dow = new Date(ms).getUTCDay();
        if (deliveryDays.includes(dow)) return ms;
        ms += DAY_MS;
    }
    return ms;
}

function prevDeliveryDay(fromMs: number, deliveryDays: number[]): number {
    let ms = fromMs;
    for (let i = 0; i < 7; i++) {
        const dow = new Date(ms).getUTCDay();
        if (deliveryDays.includes(dow)) return ms;
        ms -= DAY_MS;
    }
    return ms;
}

function startOfDayUtc(ms: number): number {
    const d = new Date(ms);
    return Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate());
}

function workHourMs(
    dayMs: number,
    hourOffset: number,
    rand: () => number,
): number {
    const base = startOfDayUtc(dayMs);
    const hour = Math.floor(8 + hourOffset + rand() * (8 - hourOffset));
    const min = Math.floor(rand() * 60);
    return base + hour * 3_600_000 + min * 60_000;
}

// Latest working-hours timestamp strictly before limitMs (08:00–16:59 UTC)
function latestWorkingTs(limitMs: number, rand: () => number): number {
    let dayStart = startOfDayUtc(limitMs);
    const todayOffset = limitMs - dayStart;
    if (todayOffset > WORK_START_MS + 60_000) {
        const ceiling = Math.min(todayOffset - 60_000, WORK_END_MS - 60_000);
        const rangeMs = ceiling - WORK_START_MS;
        return (
            dayStart + WORK_START_MS + Math.floor(rand() * Math.max(1, rangeMs))
        );
    }
    // limitMs is before or just at start of working hours today — use previous day
    dayStart -= DAY_MS;
    return (
        dayStart +
        WORK_START_MS +
        Math.floor(rand() * (WORK_END_MS - 60_000 - WORK_START_MS))
    );
}

function yyyymmdd(ms: number): string {
    const d = new Date(ms);
    const y = d.getUTCFullYear();
    const m = String(d.getUTCMonth() + 1).padStart(2, "0");
    const day = String(d.getUTCDate()).padStart(2, "0");
    return `${y}${m}${day}`;
}

function yymmdd(ms: number): string {
    const full = yyyymmdd(ms);
    return full.slice(2);
}

function isoDate(ms: number): string {
    const d = new Date(ms);
    return d.toISOString().slice(0, 10);
}

function roundQty(unit: string, qty: number): number {
    if (unit === "kg" || unit === "l") {
        return Math.round(qty * 2) / 2;
    }
    return Math.round(qty);
}

function minUnit(unit: string): number {
    return unit === "kg" || unit === "l" ? 0.5 : 1;
}

export function generateMovements({
    products,
    categories,
    now,
    seed,
}: GenerateMovementsParams): Movement[] {
    const rng = makeRng(seed);
    const { rand, int } = rng;

    const catById = new Map(categories.map((c) => [c.id, c]));

    const startMs = now.getTime() - 90 * DAY_MS;
    const endMs = now.getTime() - 3_600_000; // now - 1 hour
    // Leave 10 days at the end for balancing receipts
    const loopEndMs = endMs - 10 * DAY_MS;

    const batchCountByDay = new Map<string, number>();

    function nextBatch(dayMs: number): string {
        const key = yyyymmdd(dayMs);
        const n = (batchCountByDay.get(key) ?? 0) + 1;
        batchCountByDay.set(key, n);
        return `B${yymmdd(dayMs)}-${String(n).padStart(3, "0")}`;
    }

    // References for shipment/write-off/adjustment are deferred until after sort
    const allMovements: Array<Omit<Movement, "id">> = [];

    for (const product of products) {
        const supplierId = resolveByAncestor(
            product.categoryId,
            CATEGORY_SUPPLIER,
            catById,
        ) as string;
        if (!supplierId) throw new Error(`No supplier for ${product.id}`);

        const deliveryDays = SUPPLIER_DELIVERY_DAYS[supplierId];

        const shelfLife = product.perishable
            ? ((resolveByAncestor(
                  product.categoryId,
                  SHELF_LIFE,
                  catById,
              ) as number) ?? 30)
            : 0;

        const mn = minUnit(product.unit);
        let stock = 0;
        let prevProductTs = 0;

        // Ensure ts is strictly after the previous movement for this product.
        // If not, advance by 5 min; if that spills past 17:00, move to 08:00 next day.
        function clampTs(ts: number): number {
            if (ts <= prevProductTs) {
                let adjusted = prevProductTs + 5 * 60_000;
                const dayStart = startOfDayUtc(adjusted);
                if (adjusted >= dayStart + WORK_END_MS) {
                    adjusted = dayStart + DAY_MS + WORK_START_MS;
                }
                ts = adjusted;
            }
            prevProductTs = ts;
            return ts;
        }

        function makeReceiptAt(dayMs: number, qty: number, hourOff = 0): void {
            qty = Math.max(mn, roundQty(product.unit, qty));
            const rawTs = workHourMs(dayMs, hourOff, rand);
            const ts = clampTs(rawTs);
            // Derive actual day from clamped ts so reference and batch stay consistent
            const actualDayMs = startOfDayUtc(ts);
            const supNum = supplierId.slice(4); // "001".."008"
            const ref = `INV-SUP${supNum}-${yyyymmdd(actualDayMs)}`;
            const mov: Omit<Movement, "id"> = {
                type: "receipt",
                productId: product.id,
                quantity: qty,
                date: new Date(ts).toISOString(),
                reference: ref,
                supplierId,
            };
            if (product.perishable) {
                mov.batch = nextBatch(actualDayMs);
                mov.expiresAt = isoDate(actualDayMs + shelfLife * DAY_MS);
            }
            allMovements.push(mov);
            stock += qty;
        }

        function makeShipmentAt(ts: number, qty: number): void {
            ts = clampTs(ts);
            qty = Math.abs(roundQty(product.unit, qty));
            if (qty > stock) qty = stock;
            if (qty < mn) return;
            allMovements.push({
                type: "shipment",
                productId: product.id,
                quantity: -qty,
                date: new Date(ts).toISOString(),
                reference: "", // assigned in final pass
            });
            stock -= qty;
        }

        function makeWriteOffAt(ts: number, qty: number): void {
            ts = clampTs(ts);
            qty = Math.abs(roundQty(product.unit, qty));
            if (qty >= stock) qty = roundQty(product.unit, stock * 0.5);
            if (qty < mn) return;
            const comment = rand() < 0.5 ? "Expired" : "Damaged";
            allMovements.push({
                type: "write-off",
                productId: product.id,
                quantity: -qty,
                date: new Date(ts).toISOString(),
                reference: "", // assigned in final pass
                comment,
            });
            stock -= qty;
        }

        function makeAdjustmentAt(ts: number, qty: number): void {
            if (qty === 0) return;
            ts = clampTs(ts);
            allMovements.push({
                type: "adjustment",
                productId: product.id,
                quantity: qty,
                date: new Date(ts).toISOString(),
                reference: "", // assigned in final pass
                comment: "Stock count correction",
            });
            stock += qty;
        }

        // --- Initial receipt in the first week ---
        const firstDelivery = nextDeliveryDay(startMs, deliveryDays);
        const initQty = roundQty(
            product.unit,
            product.minQuantity * (4 + rand() * 4),
        );
        makeReceiptAt(firstDelivery, Math.max(initQty, mn * 10));

        // --- Main loop ---
        const willAdjust = rand() < 1 / 3;
        let adjDone = false;
        // Pick a random iteration to do the adjustment (roughly mid-history)
        const adjIterTarget = int(2, 8);
        let iterCount = 0;

        let curDayMs = firstDelivery + int(3, 6) * DAY_MS;

        while (curDayMs <= loopEndMs) {
            iterCount++;

            // Shipment
            if (stock >= mn) {
                const fraction = 0.1 + rand() * 0.2;
                const rawQty = Math.max(mn, stock * fraction);
                const shipQty = Math.min(stock, roundQty(product.unit, rawQty));
                makeShipmentAt(workHourMs(curDayMs, 0, rand), shipQty);
            }

            // Occasional write-off for perishables
            if (product.perishable && stock >= mn * 2 && rand() < 0.1) {
                const woQty = Math.max(mn, stock * (0.02 + rand() * 0.04));
                const woTs = workHourMs(curDayMs, 2, rand); // later in the day
                makeWriteOffAt(woTs, woQty);
            }

            // Replenishment if stock dropped below min
            if (stock < product.minQuantity) {
                const repDayMs = nextDeliveryDay(
                    curDayMs + DAY_MS,
                    deliveryDays,
                );
                if (repDayMs <= loopEndMs) {
                    const repQty = roundQty(
                        product.unit,
                        product.minQuantity * (2 + rand() * 2),
                    );
                    makeReceiptAt(repDayMs, Math.max(repQty, mn * 5), 1);
                    curDayMs = repDayMs;
                }
            }

            // Adjustment at a chosen iteration
            if (
                willAdjust &&
                !adjDone &&
                iterCount >= adjIterTarget &&
                stock >= mn * 2
            ) {
                const adjSign = rand() < 0.5 ? 1 : -1;
                const rawAdj = Math.max(mn, stock * (0.02 + rand() * 0.05));
                let adjQty = roundQty(product.unit, rawAdj);
                if (adjSign < 0 && adjQty >= stock) {
                    adjQty = roundQty(product.unit, stock * 0.3);
                }
                if (adjQty >= mn) {
                    makeAdjustmentAt(
                        workHourMs(curDayMs, 4, rand),
                        adjSign * adjQty,
                    );
                    adjDone = true;
                }
            }

            curDayMs += int(7, 12) * DAY_MS;
        }

        // --- Balancing movement ---
        const diff = product.quantity - stock;
        const absDiff = Math.abs(diff);

        if (absDiff >= mn) {
            if (diff > 0) {
                // Need a receipt — find a delivery day before endMs
                const balDayMs = prevDeliveryDay(endMs - DAY_MS, deliveryDays);
                const safeDay = Math.min(balDayMs, endMs - DAY_MS);
                makeReceiptAt(safeDay, diff, 3);
            } else {
                // Need a shipment — place it at the latest valid working-hours slot
                makeShipmentAt(latestWorkingTs(endMs, rand), absDiff);
            }
        }
    }

    // Sort by date, then assign IDs and document numbers in chronological order
    allMovements.sort((a, b) => a.date.localeCompare(b.date));

    let soNum = 1;
    let woNum = 1;
    let adjNum = 1;

    return allMovements.map((m, i) => {
        let ref = m.reference;
        if (m.type === "shipment")
            ref = `SO-${String(soNum++).padStart(5, "0")}`;
        else if (m.type === "write-off")
            ref = `WO-${String(woNum++).padStart(5, "0")}`;
        else if (m.type === "adjustment")
            ref = `ADJ-${String(adjNum++).padStart(5, "0")}`;
        return {
            ...m,
            id: `mov-${String(i + 1).padStart(5, "0")}`,
            reference: ref,
        };
    });
}
