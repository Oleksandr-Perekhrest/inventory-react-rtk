// local dependencies
import { toLocalIsoDate } from "@/lib/date";
import { type Unit, formatUnit } from "@/domain";
import type { MovementListItem } from "@/api/types";

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

export function hasDetails(movement: MovementListItem): boolean {
    return (
        movement.batch !== undefined ||
        movement.expiresAt !== undefined ||
        movement.comment !== undefined ||
        movement.discrepancyNote !== undefined ||
        (movement.expectedQuantity !== undefined &&
            movement.expectedQuantity !== movement.quantity)
    );
}

const localDateFormatter = new Intl.DateTimeFormat("en-GB", {
    dateStyle: "medium",
});

export function formatLocalDate(isoDate: string): string {
    // new Date("YYYY-MM-DD") is parsed as UTC and shifts the displayed day in
    // negative-offset time zones; the multi-argument constructor uses local time.
    const parts = isoDate.split("-");
    const year = Number(parts[0]);
    const month = Number(parts[1]);
    const day = Number(parts[2]);
    return localDateFormatter.format(new Date(year, month - 1, day));
}

export function presetRange(
    days: number,
    today: Date,
): { from: string; to: string } {
    const from = new Date(today);
    from.setDate(from.getDate() - (days - 1));
    return { from: toLocalIsoDate(from), to: toLocalIsoDate(today) };
}
