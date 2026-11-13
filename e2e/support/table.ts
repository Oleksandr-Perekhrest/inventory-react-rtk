// outsource dependencies
import type { Page } from "@playwright/test";

/** Returns the 0-based index of the column whose header text equals `name` (case-insensitive). */
export async function getColumnIndex(
    page: Page,
    name: string,
): Promise<number> {
    const headers = page.getByRole("columnheader");
    const count = await headers.count();
    for (let i = 0; i < count; i++) {
        const text = await headers.nth(i).textContent();
        if (text?.trim().toLowerCase() === name.toLowerCase()) return i;
    }
    throw new Error(`Column header "${name}" not found`);
}

/** Parses a formatted quantity string such as "280 pcs" or "1,234.5 kg" to a plain number. */
export function parseQuantity(text: string): number {
    const digits = text.replace(/,/g, "").match(/[\d.]+/)?.[0];
    if (digits === undefined)
        throw new Error(`Cannot parse quantity from "${text}"`);
    return parseFloat(digits);
}
