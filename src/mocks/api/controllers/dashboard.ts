// local dependencies
import type { Db } from "../../db";
import { stockStatus } from "../../../domain";
import { toLocalIsoDate } from "../../../lib/date";
import type { DashboardSummary } from "../../../api/types";

const DAILY_WINDOW = 30;
const RUNNING_LOW_LIMIT = 5;

export function getDashboard({ db }: { db: Db }): { body: DashboardSummary } {
    const products = [...db.products];
    const movements = [...db.movements];

    const priceMap = new Map(products.map((p) => [p.id, p.price]));

    let rawStockValue = 0;
    for (const p of products) {
        rawStockValue += p.quantity * p.price;
    }
    const stockValue = Math.round(rawStockValue);

    const productCount = products.length;
    let lowStockCount = 0;
    let outOfStockCount = 0;
    for (const p of products) {
        const s = stockStatus(p);
        if (s === "low") lowStockCount++;
        else if (s === "out") outOfStockCount++;
    }

    const runningLow = products
        .filter((p) => {
            const s = stockStatus(p);
            return s === "low" || s === "out";
        })
        .sort((a, b) => {
            const ratioA = a.minQuantity === 0 ? 0 : a.quantity / a.minQuantity;
            const ratioB = b.minQuantity === 0 ? 0 : b.quantity / b.minQuantity;
            if (ratioA !== ratioB) return ratioA - ratioB;
            return a.name.localeCompare(b.name);
        })
        .slice(0, RUNNING_LOW_LIMIT);

    const today = db.now();

    const dates: string[] = [];
    for (let i = DAILY_WINDOW - 1; i >= 0; i--) {
        const d = new Date(today);
        d.setDate(d.getDate() - i);
        dates.push(toLocalIsoDate(d));
    }

    const dateSet = new Set(dates);
    const inflowMap = new Map<string, number>(dates.map((d) => [d, 0]));
    const outflowMap = new Map<string, number>(dates.map((d) => [d, 0]));

    for (const m of movements) {
        if (m.type === "adjustment") continue;
        const localDate = toLocalIsoDate(new Date(m.date));
        if (!dateSet.has(localDate)) continue;
        const price = priceMap.get(m.productId) ?? 0;
        if (m.type === "receipt") {
            inflowMap.set(
                localDate,
                (inflowMap.get(localDate) ?? 0) + m.quantity * price,
            );
        } else if (m.type === "shipment" || m.type === "write-off") {
            outflowMap.set(
                localDate,
                (outflowMap.get(localDate) ?? 0) + Math.abs(m.quantity) * price,
            );
        }
    }

    const daily = dates.map((date) => ({
        date,
        inflow: Math.round(inflowMap.get(date) ?? 0),
        outflow: Math.round(outflowMap.get(date) ?? 0),
    }));

    return {
        body: {
            stockValue,
            productCount,
            lowStockCount,
            outOfStockCount,
            runningLow,
            daily,
        },
    };
}
