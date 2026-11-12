// local dependencies
import { type Unit, formatUnit } from "@/domain";

export const dateTimeFormatter = new Intl.DateTimeFormat("en-GB", {
    dateStyle: "medium",
    timeStyle: "short",
});

export function formatDateTime(isoDateTime: string): string {
    return dateTimeFormatter.format(new Date(isoDateTime));
}

const quantityFormatter = new Intl.NumberFormat("en-US", {
    maximumFractionDigits: 3,
});

export function formatSignedQuantity(quantity: number, unit: Unit): string {
    const prefix = quantity > 0 ? "+" : quantity < 0 ? "−" : "";
    return `${prefix}${quantityFormatter.format(Math.abs(quantity))} ${formatUnit(unit)}`;
}

export function formatDiscrepancyQuantity(
    quantity: number,
    expectedQuantity: number,
    unit: Unit,
): string {
    return `${quantityFormatter.format(quantity)} / ${quantityFormatter.format(expectedQuantity)} ${formatUnit(unit)}`;
}

export type DiscrepancyKind = "short" | "over";

export function discrepancyKind(
    quantity: number,
    expectedQuantity: number,
): DiscrepancyKind {
    return quantity < expectedQuantity ? "short" : "over";
}
