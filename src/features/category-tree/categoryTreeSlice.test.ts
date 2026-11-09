// outsource dependencies
import { it, expect, describe } from "vitest";

// local dependencies
import {
    toggle,
    expandMany,
    setFocused,
    collapseAll,
    selectFocusedId,
    selectIsFocused,
    selectIsExpanded,
    categoryTreeSlice,
} from "./categoryTreeSlice";

const { reducer } = categoryTreeSlice;
const init = reducer(undefined, { type: "@@INIT" });

const wrap = (s: typeof init) => ({ categoryTree: s });

describe("toggle", () => {
    it("marks a node as expanded", () => {
        const s = reducer(init, toggle("cat-2"));
        expect(s.expanded).toEqual({ "cat-2": true });
    });

    it("toggling an already-expanded node collapses it", () => {
        const s1 = reducer(init, toggle("cat-2"));
        const s2 = reducer(s1, toggle("cat-2"));
        expect(s2.expanded).toEqual({});
    });

    it("toggling different nodes expands them independently", () => {
        const s = reducer(reducer(init, toggle("cat-2")), toggle("cat-4"));
        expect(s.expanded).toEqual({ "cat-2": true, "cat-4": true });
    });
});

describe("expandMany", () => {
    it("marks every listed node as expanded", () => {
        const s = reducer(init, expandMany(["cat-2", "cat-4"]));
        expect(s.expanded).toEqual({ "cat-2": true, "cat-4": true });
    });

    it("does not collapse previously expanded nodes outside the list", () => {
        const s1 = reducer(init, toggle("cat-7"));
        const s2 = reducer(s1, expandMany(["cat-2"]));
        expect(s2.expanded).toEqual({ "cat-7": true, "cat-2": true });
    });
});

describe("collapseAll", () => {
    it("removes all expanded entries", () => {
        const s1 = reducer(init, expandMany(["cat-2", "cat-4", "cat-7"]));
        const s2 = reducer(s1, collapseAll());
        expect(s2.expanded).toEqual({});
    });
});

describe("setFocused", () => {
    it("stores the focused id", () => {
        const s = reducer(init, setFocused("cat-2"));
        expect(s.focusedId).toBe("cat-2");
    });

    it("clears the focused id when set to null", () => {
        const s1 = reducer(init, setFocused("cat-2"));
        const s2 = reducer(s1, setFocused(null));
        expect(s2.focusedId).toBeNull();
    });
});

describe("selectors", () => {
    describe("selectIsExpanded", () => {
        it("returns true for an expanded node", () => {
            const s = reducer(init, expandMany(["cat-2"]));
            expect(selectIsExpanded(wrap(s), "cat-2")).toBe(true);
        });

        it("returns false for a node that is not expanded", () => {
            const s = reducer(init, expandMany(["cat-2"]));
            expect(selectIsExpanded(wrap(s), "cat-4")).toBe(false);
        });
    });

    describe("selectFocusedId", () => {
        it("returns the currently focused id", () => {
            const s = reducer(init, setFocused("cat-4"));
            expect(selectFocusedId(wrap(s))).toBe("cat-4");
        });

        it("returns null when nothing is focused", () => {
            expect(selectFocusedId(wrap(init))).toBeNull();
        });
    });

    describe("selectIsFocused", () => {
        it("returns true for the focused node", () => {
            const s = reducer(init, setFocused("cat-2"));
            expect(selectIsFocused(wrap(s), "cat-2")).toBe(true);
        });

        it("returns false for a node that is not focused", () => {
            const s = reducer(init, setFocused("cat-2"));
            expect(selectIsFocused(wrap(s), "cat-4")).toBe(false);
        });
    });
});
