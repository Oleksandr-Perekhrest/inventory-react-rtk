// outsource dependencies
import userEvent from "@testing-library/user-event";
import { screen, within, waitFor } from "@testing-library/react";
import {
    it,
    expect,
    afterAll,
    describe,
    afterEach,
    beforeAll,
    beforeEach,
} from "vitest";

// local dependencies
import { setBackendReady } from "@/api/backendReady";
import { createMockServer } from "@/test/mockServer";
import { renderWithRouter } from "@/test/renderWithRouter";

const { db, server } = createMockServer();

type C = (typeof db.categories)[number];

function computeDepth(id: string): number {
    let depth = 0;
    let currentId: string | null = id;
    while (currentId !== null) {
        const cat = db.categories.find((c) => c.id === currentId);
        if (!cat || cat.parentId === null) break;
        depth++;
        currentId = cat.parentId;
    }
    return depth;
}

// Any root category — used to click in case 3
const anyRootCategory: C = (() => {
    const found = db.categories.find((c) => c.parentId === null);
    if (!found) throw new Error("Seed has no root categories");
    return found;
})();

// Category at maximum depth — used for the deep-link case 4
const deepestCategory: C = (() => {
    let maxDepth = 0;
    let deepest: C | undefined;
    for (const cat of db.categories) {
        const d = computeDepth(cat.id);
        if (d > maxDepth) {
            maxDepth = d;
            deepest = cat;
        }
    }
    if (!deepest) throw new Error("Seed has no categories");
    return deepest;
})();

function getTreeitem(treeEl: HTMLElement, categoryId: string): HTMLElement {
    const el = within(treeEl)
        .getAllByRole("treeitem")
        .find((e) => e.getAttribute("data-category-id") === categoryId);
    if (!el)
        throw new Error(`treeitem[data-category-id="${categoryId}"] not found`);
    return el;
}

function getTreeitemRow(treeEl: HTMLElement, categoryId: string): HTMLElement {
    const li = getTreeitem(treeEl, categoryId);
    const div = li.firstElementChild;
    if (!(div instanceof HTMLElement))
        throw new Error(`treeitem "${categoryId}" has no clickable row div`);
    return div;
}

beforeAll(() => server.listen({ onUnhandledFrame: "error" }));
afterAll(() => server.close());
afterEach(() => {
    server.resetHandlers();
    setBackendReady(Promise.resolve());
});

describe("CatalogPage – mobile layout", () => {
    describe("375 px mobile viewport", () => {
        const originalInnerWidth = window.innerWidth;

        beforeEach(() => {
            Object.defineProperty(window, "innerWidth", {
                writable: true,
                configurable: true,
                value: 375,
            });
        });

        afterEach(() => {
            Object.defineProperty(window, "innerWidth", {
                writable: true,
                configurable: true,
                value: originalInnerWidth,
            });
        });

        it("1 — no inline tree and trigger reads 'Category: All products'", async () => {
            await renderWithRouter("/catalog");
            expect(screen.queryByRole("tree")).not.toBeInTheDocument();
            screen.getByRole("button", { name: "Category: All products" });
        });

        it("2 — opening sheet: dialog 'Categories' has exactly one tree; focused element is treeitem[tabindex='0']", async () => {
            const user = userEvent.setup();
            await renderWithRouter("/catalog");

            await user.click(
                screen.getByRole("button", { name: "Category: All products" }),
            );

            const dialog = screen.getByRole("dialog", { name: "Categories" });
            expect(within(dialog).getAllByRole("tree")).toHaveLength(1);

            // Wait for categories to load inside the sheet
            await within(dialog).findAllByRole("treeitem");

            // The focused element must be the roving-tabindex treeitem, not the search input
            await waitFor(() => {
                expect(document.activeElement?.getAttribute("role")).toBe(
                    "treeitem",
                );
                expect(document.activeElement?.getAttribute("tabindex")).toBe(
                    "0",
                );
            });
        });

        it("3 — clicking a treeitem: dialog closes, URL has categoryId, trigger reflects name, focus returns to trigger", async () => {
            const user = userEvent.setup();
            const { router } = await renderWithRouter("/catalog");

            await user.click(
                screen.getByRole("button", { name: "Category: All products" }),
            );

            const dialog = screen.getByRole("dialog", { name: "Categories" });
            const treeEl = within(dialog).getByRole("tree");
            await within(dialog).findAllByRole("treeitem");

            await user.click(getTreeitemRow(treeEl, anyRootCategory.id));

            // Dialog closes
            await waitFor(() => {
                expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
            });

            // URL carries categoryId
            expect(router.state.location.searchStr).toContain(
                `categoryId=${anyRootCategory.id}`,
            );

            // Trigger reflects the selected category name
            await screen.findByRole("button", {
                name: `Category: ${anyRootCategory.name}`,
            });

            // Radix returns focus to the trigger in a setTimeout
            await waitFor(() => {
                expect(
                    screen.getByRole("button", {
                        name: `Category: ${anyRootCategory.name}`,
                    }),
                ).toHaveFocus();
            });
        });

        it("4 — deep link: opening the sheet focuses the selected category's treeitem (aria-selected='true')", async () => {
            const user = userEvent.setup();
            await renderWithRouter(`/catalog?categoryId=${deepestCategory.id}`);

            // Wait for trigger to show category name — confirms categories are cached
            await screen.findByRole("button", {
                name: `Category: ${deepestCategory.name}`,
            });

            await user.click(
                screen.getByRole("button", {
                    name: `Category: ${deepestCategory.name}`,
                }),
            );

            const dialog = screen.getByRole("dialog", { name: "Categories" });
            await within(dialog).findAllByRole("treeitem");

            const treeEl = within(dialog).getByRole("tree");

            // Expand-to-selected effect must run, making the deep node visible and selected
            await waitFor(() => {
                expect(getTreeitem(treeEl, deepestCategory.id)).toHaveAttribute(
                    "aria-selected",
                    "true",
                );
            });

            // The focused element must be that treeitem
            await waitFor(() => {
                expect(
                    document.activeElement?.getAttribute("data-category-id"),
                ).toBe(deepestCategory.id);
                expect(document.activeElement?.getAttribute("tabindex")).toBe(
                    "0",
                );
            });
        });
    });

    describe("desktop guard (1024 px default)", () => {
        it("5 — 1024 px: no 'Category: …' trigger and exactly one tree rendered", async () => {
            await renderWithRouter("/catalog");

            expect(
                screen.queryByRole("button", { name: /^Category:/i }),
            ).not.toBeInTheDocument();

            const trees = await screen.findAllByRole("tree");
            expect(trees).toHaveLength(1);
        });
    });
});
