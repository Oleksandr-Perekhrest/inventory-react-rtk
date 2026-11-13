// local dependencies
import { type Unit, formatUnit } from "@/domain";

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
