// local dependencies
import type { Unit, Product } from "@/domain";

export function stockStatus(product: Product): "out" | "low" | "ok" {
    if (product.quantity === 0) return "out";
    if (product.quantity > 0 && product.quantity < product.minQuantity)
        return "low";
    return "ok";
}

const priceFormatter = new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "UAH",
    currencyDisplay: "narrowSymbol",
});

export function formatPrice(kopecks: number): string {
    return priceFormatter.format(kopecks / 100);
}

const quantityFormatter = new Intl.NumberFormat("en-US", {
    maximumFractionDigits: 3,
});

// Display labels; "L" for litres so it is not confused with "1" in mono fonts
const UNIT_LABELS: Record<Unit, string> = {
    pcs: "pcs",
    kg: "kg",
    l: "L",
    box: "box",
};

export function formatQuantity(quantity: number, unit: Unit): string {
    return `${quantityFormatter.format(quantity)} ${UNIT_LABELS[unit]}`;
}
