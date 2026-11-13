// outsource dependencies
import type { Locator } from "@playwright/test";

export async function readTreeItemCount(item: Locator): Promise<number> {
    const text = (await item.innerText()).trim();
    const match = text.match(/(\d+)\s*$/);
    if (!match) throw new Error(`No trailing count in "${text}"`);
    return parseInt(match[1], 10);
}
