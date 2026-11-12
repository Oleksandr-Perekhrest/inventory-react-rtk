/**
 * Merges `patch` into `prev`. If any key other than "page" changes value
 * (strict equality), page is reset to 1. When the patch explicitly carries a
 * "page" value, that value is used as-is — no reset is applied.
 */
export function applySearchPatch<T extends { page?: number }>(
    prev: T,
    patch: Partial<T>,
): T {
    let resetsPage = false;
    if (!("page" in patch)) {
        for (const key in patch) {
            if (patch[key] !== prev[key]) {
                resetsPage = true;
                break;
            }
        }
    }
    return {
        ...prev,
        ...patch,
        ...(resetsPage ? { page: 1 } : {}),
    };
}
