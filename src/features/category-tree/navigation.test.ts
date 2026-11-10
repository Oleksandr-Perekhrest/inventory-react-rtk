// outsource dependencies
import { it, expect, describe } from "vitest";

// local dependencies
import { getKeyAction } from "./navigation";
import { ROOT, type VisibleNode } from "./tree";

// Visible order used by most tests:
//   0  Food      (cat-2) — expanded parent at root level
//   1  Frozen    (cat-4) — collapsed parent, child of Food
//   2  Dairy     (cat-3) — leaf, child of Food
//   3  Beverages (cat-1) — leaf at root level
//   4  Chemicals (cat-7) — leaf at root level, last item
const order: VisibleNode[] = [
    {
        id: "cat-2",
        parentId: ROOT,
        level: 1,
        hasChildren: true,
        expanded: true,
    },
    {
        id: "cat-4",
        parentId: "cat-2",
        level: 2,
        hasChildren: true,
        expanded: false,
    },
    {
        id: "cat-3",
        parentId: "cat-2",
        level: 2,
        hasChildren: false,
        expanded: false,
    },
    {
        id: "cat-1",
        parentId: ROOT,
        level: 1,
        hasChildren: false,
        expanded: false,
    },
    {
        id: "cat-7",
        parentId: ROOT,
        level: 1,
        hasChildren: false,
        expanded: false,
    },
];

const names = new Map([
    ["cat-2", "Food"],
    ["cat-4", "Frozen"],
    ["cat-3", "Dairy"],
    ["cat-1", "Beverages"],
    ["cat-7", "Chemicals"],
]);

describe("ArrowDown / ArrowUp", () => {
    it("ArrowDown moves focus to the next item", () => {
        expect(getKeyAction(order, "cat-2", "ArrowDown", false)).toEqual({
            type: "focus",
            id: "cat-4",
        });
    });

    it("ArrowDown on the last item returns none", () => {
        expect(getKeyAction(order, "cat-7", "ArrowDown", false)).toEqual({
            type: "none",
        });
    });

    it("ArrowUp moves focus to the previous item", () => {
        expect(getKeyAction(order, "cat-4", "ArrowUp", false)).toEqual({
            type: "focus",
            id: "cat-2",
        });
    });

    it("ArrowUp on the first item returns none", () => {
        expect(getKeyAction(order, "cat-2", "ArrowUp", false)).toEqual({
            type: "none",
        });
    });
});

describe("ArrowRight", () => {
    it("on a collapsed parent returns toggle", () => {
        expect(getKeyAction(order, "cat-4", "ArrowRight", false)).toEqual({
            type: "toggle",
            id: "cat-4",
        });
    });

    it("on an expanded parent focuses the first child", () => {
        // cat-2 is expanded; order[1] = cat-4 is the first child
        expect(getKeyAction(order, "cat-2", "ArrowRight", false)).toEqual({
            type: "focus",
            id: "cat-4",
        });
    });

    it("on a leaf returns none", () => {
        expect(getKeyAction(order, "cat-7", "ArrowRight", false)).toEqual({
            type: "none",
        });
    });
});

describe("ArrowLeft", () => {
    it("on an expanded parent returns toggle", () => {
        expect(getKeyAction(order, "cat-2", "ArrowLeft", false)).toEqual({
            type: "toggle",
            id: "cat-2",
        });
    });

    it("on a child focuses the parent", () => {
        expect(getKeyAction(order, "cat-4", "ArrowLeft", false)).toEqual({
            type: "focus",
            id: "cat-2",
        });
    });

    it("on a root-level node returns none", () => {
        expect(getKeyAction(order, "cat-7", "ArrowLeft", false)).toEqual({
            type: "none",
        });
    });
});

describe("Home / End", () => {
    it("Home focuses the first item regardless of current position", () => {
        expect(getKeyAction(order, "cat-3", "Home", false)).toEqual({
            type: "focus",
            id: "cat-2",
        });
    });

    it("End focuses the last item regardless of current position", () => {
        expect(getKeyAction(order, "cat-2", "End", false)).toEqual({
            type: "focus",
            id: "cat-7",
        });
    });
});

describe("Enter / Space", () => {
    it("Enter on a parent returns select", () => {
        expect(getKeyAction(order, "cat-2", "Enter", false)).toEqual({
            type: "select",
            id: "cat-2",
        });
    });

    it("Space on a parent returns select", () => {
        expect(getKeyAction(order, "cat-4", " ", false)).toEqual({
            type: "select",
            id: "cat-4",
        });
    });

    it("Enter on a leaf returns select", () => {
        expect(getKeyAction(order, "cat-7", "Enter", false)).toEqual({
            type: "select",
            id: "cat-7",
        });
    });

    it("Space on a leaf returns select", () => {
        expect(getKeyAction(order, "cat-3", " ", false)).toEqual({
            type: "select",
            id: "cat-3",
        });
    });
});

describe("currentId not in order", () => {
    it("any navigation key focuses the first item when currentId is unknown", () => {
        expect(getKeyAction(order, "cat-99", "ArrowDown", false)).toEqual({
            type: "focus",
            id: "cat-2",
        });
    });
});

describe("search mode", () => {
    // In search mode the visible order already contains only matching+ancestor nodes,
    // so nodes with hasChildren=true can appear expanded=false when their visible
    // child would be order[idx+1].
    const searchOrder: VisibleNode[] = [
        {
            id: "cat-2",
            parentId: ROOT,
            level: 1,
            hasChildren: true,
            expanded: true,
        },
        {
            id: "cat-4",
            parentId: "cat-2",
            level: 2,
            hasChildren: true,
            expanded: false,
        },
        {
            id: "cat-6",
            parentId: "cat-4",
            level: 3,
            hasChildren: false,
            expanded: false,
        },
    ];

    it("ArrowRight on a node with children focuses the next item, never toggles", () => {
        expect(getKeyAction(searchOrder, "cat-4", "ArrowRight", true)).toEqual({
            type: "focus",
            id: "cat-6",
        });
    });

    it("ArrowLeft on an expanded root node returns none, never toggles", () => {
        expect(getKeyAction(searchOrder, "cat-2", "ArrowLeft", true)).toEqual({
            type: "none",
        });
    });

    it("ArrowLeft on a non-root node focuses the parent, never toggles", () => {
        expect(getKeyAction(searchOrder, "cat-4", "ArrowLeft", true)).toEqual({
            type: "focus",
            id: "cat-2",
        });
    });

    it("Enter on a parent returns select", () => {
        expect(getKeyAction(searchOrder, "cat-2", "Enter", true)).toEqual({
            type: "select",
            id: "cat-2",
        });
    });

    it("Space on a parent returns select", () => {
        expect(getKeyAction(searchOrder, "cat-4", " ", true)).toEqual({
            type: "select",
            id: "cat-4",
        });
    });
});

describe("type-ahead", () => {
    it("focuses the next item after current whose name starts with the typed character", () => {
        // from Food (idx 0), 'f' → next F-name is Frozen (cat-4)
        expect(getKeyAction(order, "cat-2", "f", false, names)).toEqual({
            type: "focus",
            id: "cat-4",
        });
    });

    it("wraps around to find a match before the current item", () => {
        // from Frozen (idx 1), 'f' → no F-name after → wraps to Food (cat-2)
        expect(getKeyAction(order, "cat-4", "f", false, names)).toEqual({
            type: "focus",
            id: "cat-2",
        });
    });

    it("returns none when no item name starts with the typed character", () => {
        expect(getKeyAction(order, "cat-2", "z", false, names)).toEqual({
            type: "none",
        });
    });
});
