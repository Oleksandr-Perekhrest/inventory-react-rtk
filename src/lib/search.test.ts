// outsource dependencies
import { it, expect, describe } from "vitest";

// local dependencies
import { applySearchPatch } from "./search";

type S = { page?: number; pageSize?: number; q?: string; type?: string };

describe("applySearchPatch", () => {
    it("resets page to 1 when a non-page key changes", () => {
        const prev: S = { page: 3, q: "a" };
        const result = applySearchPatch(prev, { q: "b" });
        expect(result.page).toBe(1);
        expect(result.q).toBe("b");
    });

    it("keeps page when patch value equals prev value", () => {
        const prev: S = { page: 3, q: "a" };
        const result = applySearchPatch(prev, { q: "a" });
        expect(result.page).toBe(3);
    });

    it("resets page to 1 when pageSize changes", () => {
        const prev: S = { page: 3, pageSize: 20 };
        const result = applySearchPatch(prev, { pageSize: 50 });
        expect(result.page).toBe(1);
        expect(result.pageSize).toBe(50);
    });

    it("resets page when an existing key is set to undefined", () => {
        const prev: S = { page: 3, q: "a" };
        const result = applySearchPatch(prev, { q: undefined });
        expect(result.page).toBe(1);
        expect(result.q).toBeUndefined();
    });

    it("keeps page when an absent key is set to undefined", () => {
        const prev: S = { page: 3, q: "a" };
        const result = applySearchPatch(prev, { type: undefined });
        expect(result.page).toBe(3);
    });

    it("uses explicit page from patch even when another key changes", () => {
        const prev: S = { page: 3, q: "a" };
        const result = applySearchPatch(prev, { q: "b", page: 4 });
        expect(result.page).toBe(4);
        expect(result.q).toBe("b");
    });

    it("returns an equal object with page unchanged on empty patch", () => {
        const prev: S = { page: 3, q: "a" };
        const result = applySearchPatch(prev, {});
        expect(result.page).toBe(3);
        expect(result).toEqual(prev);
    });

    it("does not mutate prev", () => {
        const prev = Object.freeze<S>({ page: 3, q: "a" });
        const result = applySearchPatch(prev, { q: "b" });
        expect(result).not.toBe(prev);
        expect(result.page).toBe(1);
        expect(result.q).toBe("b");
    });
});
