// outsource dependencies
import type { Page } from "@playwright/test";

const STORAGE_KEY = "warehouse-manager:network";

export async function setFailRequests(
    page: Page,
    rules: string[],
): Promise<void> {
    await page.evaluate(
        ([key, failRequests]) => {
            const raw = localStorage.getItem(key);
            let parsed: Record<string, unknown> = {};
            try {
                const val = raw !== null ? JSON.parse(raw) : null;
                if (
                    val !== null &&
                    typeof val === "object" &&
                    !Array.isArray(val)
                ) {
                    parsed = val as Record<string, unknown>;
                }
            } catch {
                // invalid JSON — start fresh
            }
            parsed.failRequests = failRequests;
            localStorage.setItem(key, JSON.stringify(parsed));
        },
        [STORAGE_KEY, rules] as const,
    );
}
