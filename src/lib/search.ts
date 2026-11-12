/**
 * Merges `patch` into `prev`. If any key other than "page" changes value
 * (strict equality), page is reset to 1. When the patch explicitly carries a
 * "page" value, that value is used as-is — no reset is applied.
 */
export function applySearchPatch<T extends { page?: number }>(
    prev: T,
    patch: Partial<T>,
): T {
    const hasPageInPatch = "page" in patch;
    const resetsPage =
        !hasPageInPatch &&
        (Object.keys(patch) as Array<keyof T>).some(
            (k) => patch[k] !== prev[k],
        );
    return {
        ...prev,
        ...patch,
        ...(resetsPage ? { page: 1 } : {}),
    };
}
