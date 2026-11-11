// local dependencies
import { type Unit, formatUnit, type Product } from "@/domain";

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

export function formatQuantity(quantity: number, unit: Unit): string {
    return `${quantityFormatter.format(quantity)} ${formatUnit(unit)}`;
}
