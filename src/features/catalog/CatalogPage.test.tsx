// outsource dependencies
import userEvent from "@testing-library/user-event";
import { screen, within, waitFor } from "@testing-library/react";
import { it, expect, afterAll, describe, afterEach, beforeAll } from "vitest";

// local dependencies
import { setBackendReady } from "@/api/backendReady";
import { createMockServer } from "@/test/mockServer";
import { renderWithRouter } from "@/test/renderWithRouter";

const { db, server } = createMockServer();

type C = (typeof db.categories)[number];

// --- Mirror the controller's includeDescendants logic ---

function buildChildrenMap(categories: readonly C[]): Map<string, string[]> {
    const map = new Map<string, string[]>();
    for (const cat of categories) {
        if (cat.parentId !== null) {
            const siblings = map.get(cat.parentId);
            if (siblings) siblings.push(cat.id);
            else map.set(cat.parentId, [cat.id]);
        }
    }
    return map;
}

function collectDescendantIds(
    id: string,
    cm: Map<string, string[]>,
): Set<string> {
    const result = new Set<string>([id]);
    const queue = [id];
    while (queue.length > 0) {
        const current = queue.shift();
        if (current === undefined) break;
        for (const childId of cm.get(current) ?? []) {
            result.add(childId);
            queue.push(childId);
        }
    }
    return result;
}

function countWithDescendants(categoryId: string): number {
    const cm = buildChildrenMap(db.categories);
    const ids = collectDescendantIds(categoryId, cm);
    return db.products.filter((p) => ids.has(p.categoryId)).length;
}

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

function getAncestorIds(categoryId: string): string[] {
    const ancestors: string[] = [];
    let currentId: string | null = categoryId;
    while (currentId !== null) {
        const cat = db.categories.find((c) => c.id === currentId);
        if (!cat || cat.parentId === null) break;
        ancestors.push(cat.parentId);
        currentId = cat.parentId;
    }
    return ancestors;
}

// --- Fixture categories (derived from db, no hardcoded names or IDs) ---

// First root that has at least one child (by array order = seed position)
const rootWithChildren: C = (() => {
    const childParents = new Set<string>();
    for (const cat of db.categories) {
        if (cat.parentId !== null) childParents.add(cat.parentId);
    }
    const found = db.categories.find(
        (c) => c.parentId === null && childParents.has(c.id),
    );
    if (!found) throw new Error("Seed has no root with children");
    return found;
})();

// Category at maximum depth (depth 3 if seed has one, else deepest)
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

// --- Setup / teardown ---

beforeAll(() => server.listen({ onUnhandledFrame: "error" }));
afterAll(() => server.close());
afterEach(() => {
    server.resetHandlers();
    setBackendReady(Promise.resolve());
});

// --- Shared test helpers ---

function countLabel(n: number): string {
    return n === 1 ? "1 product" : `${n} products`;
}

function getTreeitem(treeEl: HTMLElement, categoryId: string): HTMLElement {
    const el = within(treeEl)
        .getAllByRole("treeitem")
        .find((e) => e.getAttribute("data-category-id") === categoryId);
    if (!el)
        throw new Error(`treeitem[data-category-id="${categoryId}"] not found`);
    return el;
}

// The onClick handler lives on the first child <div> inside the <li>, not on the <li> itself.
function getTreeitemRow(treeEl: HTMLElement, categoryId: string): HTMLElement {
    const li = getTreeitem(treeEl, categoryId);
    const div = li.firstElementChild;
    if (!(div instanceof HTMLElement))
        throw new Error(`treeitem "${categoryId}" has no clickable row div`);
    return div;
}

// Wait until at least one treeitem is rendered (categories loaded)
async function waitForTreeLoaded(): Promise<void> {
    await screen.findAllByRole("treeitem");
}

// --- Tests ---

describe("Tree ↔ URL ↔ table integration (T2b)", () => {
    it("1 — clicking a tree row: aria-selected on that item only, h2, count, URL categoryId", async () => {
        const user = userEvent.setup();
        const total = db.products.length;
        const { router } = await renderWithRouter("/catalog");
        await screen.findByText(countLabel(total));
        await waitForTreeLoaded();

        const treeEl = screen.getByRole("tree");
        await user.click(getTreeitemRow(treeEl, rootWithChildren.id));

        // h2 reflects category name
        await screen.findByRole("heading", {
            level: 2,
            name: rootWithChildren.name,
        });

        // Count reflects products in category + descendants
        const count = countWithDescendants(rootWithChildren.id);
        await screen.findByText(countLabel(count));

        // Exactly one treeitem is selected, and it is the clicked one
        const allTreeitems = within(treeEl).getAllByRole("treeitem");
        const selected = allTreeitems.filter(
            (el) => el.getAttribute("aria-selected") === "true",
        );
        expect(selected).toHaveLength(1);
        expect(selected[0].getAttribute("data-category-id")).toBe(
            rootWithChildren.id,
        );

        // URL carries categoryId
        expect(router.state.location.searchStr).toContain(
            `categoryId=${rootWithChildren.id}`,
        );
    });

    it('2 — "Show all products" (×): h2 "All products", categoryId gone, no aria-selected', async () => {
        const user = userEvent.setup();
        const { router } = await renderWithRouter(
            `/catalog?categoryId=${rootWithChildren.id}`,
        );
        await waitForTreeLoaded();

        // Wait for the category name to show, then clear selection
        await screen.findByRole("heading", {
            level: 2,
            name: rootWithChildren.name,
        });

        await user.click(
            screen.getByRole("button", { name: "Show all products" }),
        );

        await screen.findByRole("heading", { level: 2, name: "All products" });
        expect(router.state.location.searchStr).not.toContain("categoryId");

        const treeEl = screen.getByRole("tree");
        const allTreeitems = within(treeEl).getAllByRole("treeitem");
        for (const item of allTreeitems) {
            expect(item).not.toHaveAttribute("aria-selected");
        }
    });

    it("3 — deep link: every ancestor expanded, node visible/selected, h2, count", async () => {
        const ancestorIds = getAncestorIds(deepestCategory.id);
        const count = countWithDescendants(deepestCategory.id);

        await renderWithRouter(`/catalog?categoryId=${deepestCategory.id}`);
        await waitForTreeLoaded();

        // h2 shows the deep category's name
        await screen.findByRole("heading", {
            level: 2,
            name: deepestCategory.name,
        });

        // Count matches products in that subtree (including descendants)
        await screen.findByText(countLabel(count));

        const treeEl = screen.getByRole("tree");

        // Every ancestor must be expanded to make the deep node visible
        for (const ancestorId of ancestorIds) {
            await waitFor(() => {
                const el = treeEl.querySelector(
                    `[data-category-id="${ancestorId}"]`,
                );
                expect(el).toBeInTheDocument();
                expect(el).toHaveAttribute("aria-expanded", "true");
            });
        }

        // The deep node itself is visible and selected
        const deepItem = getTreeitem(treeEl, deepestCategory.id);
        expect(deepItem).toHaveAttribute("aria-selected", "true");
    });

    it("4 — unknown categoryId: h2 'Unknown category', no aria-selected, explicit not-found state", async () => {
        const user = userEvent.setup();
        const total = db.products.length;
        const { router } = await renderWithRouter(
            "/catalog?categoryId=nonexistent-id-xyz",
        );
        await waitForTreeLoaded();

        // h2 shows "Unknown category" (ProductsTableHeader fallback)
        await screen.findByRole("heading", {
            level: 2,
            name: "Unknown category",
        });

        // No treeitem is selected (the id is not in the tree)
        const treeEl = screen.getByRole("tree");
        for (const item of within(treeEl).getAllByRole("treeitem")) {
            expect(item).not.toHaveAttribute("aria-selected");
        }

        // Not-found state: explicit message, no generic error alert, no Retry
        await screen.findByText("This category doesn't exist");
        expect(screen.queryByRole("alert")).not.toBeInTheDocument();
        expect(
            screen.queryByRole("button", { name: /retry/i }),
        ).not.toBeInTheDocument();

        // "Show all products" in the not-found panel (distinct from the header × button)
        const notFoundMsg = screen.getByText("This category doesn't exist");
        const notFoundPanel = notFoundMsg.parentElement;
        if (!notFoundPanel) throw new Error("not-found panel not found");
        await user.click(
            within(notFoundPanel).getByRole("button", {
                name: "Show all products",
            }),
        );

        await screen.findByRole("heading", { level: 2, name: "All products" });
        expect(router.state.location.searchStr).not.toContain("categoryId");
        await screen.findByText(countLabel(total));
    });

    it("5 — keyboard: ArrowDown moves focus, Enter selects, Space selects", async () => {
        const user = userEvent.setup();
        const total = db.products.length;
        const { router } = await renderWithRouter("/catalog");
        await screen.findByText(countLabel(total));
        await waitForTreeLoaded();

        // Sorted roots by position (same order the tree renders them)
        const sortedRoots = [...db.categories]
            .filter((c) => c.parentId === null)
            .sort((a, b) => a.position - b.position);

        // Find index of rootWithChildren in sorted roots
        const idx = sortedRoots.findIndex((c) => c.id === rootWithChildren.id);
        const secondRoot = sortedRoots[idx + 1];
        const thirdRoot = sortedRoots[idx + 2];
        if (!secondRoot || !thirdRoot)
            throw new Error("Not enough roots for keyboard test");

        const treeEl = screen.getByRole("tree");

        // Click the first root to focus it (also selects it, that is expected)
        await user.click(getTreeitemRow(treeEl, rootWithChildren.id));

        // ArrowDown → next root gets focused
        await user.keyboard("{ArrowDown}");
        await waitFor(() => {
            expect(getTreeitem(treeEl, secondRoot.id)).toHaveFocus();
        });

        // Enter → second root gets selected, URL updates
        await user.keyboard("{Enter}");
        await waitFor(() => {
            expect(router.state.location.searchStr).toContain(
                `categoryId=${secondRoot.id}`,
            );
        });
        expect(getTreeitem(treeEl, secondRoot.id)).toHaveAttribute(
            "aria-selected",
            "true",
        );
        expect(getTreeitem(treeEl, rootWithChildren.id)).not.toHaveAttribute(
            "aria-selected",
        );

        // ArrowDown → third root focused
        await user.keyboard("{ArrowDown}");
        await waitFor(() => {
            expect(getTreeitem(treeEl, thirdRoot.id)).toHaveFocus();
        });

        // Space → third root selected
        await user.keyboard(" ");
        await waitFor(() => {
            expect(router.state.location.searchStr).toContain(
                `categoryId=${thirdRoot.id}`,
            );
        });
        expect(getTreeitem(treeEl, thirdRoot.id)).toHaveAttribute(
            "aria-selected",
            "true",
        );
        expect(getTreeitem(treeEl, secondRoot.id)).not.toHaveAttribute(
            "aria-selected",
        );
    });

    it("6 — selecting a category on page 2 resets to page 1", async () => {
        const user = userEvent.setup();
        const total = db.products.length;
        const { router } = await renderWithRouter("/catalog?page=2");
        await screen.findByText(`21–${Math.min(40, total)} of ${total}`);
        await waitForTreeLoaded();

        const treeEl = screen.getByRole("tree");
        await user.click(getTreeitemRow(treeEl, rootWithChildren.id));

        await waitFor(() => {
            expect(router.state.location.searchStr).toContain(
                `categoryId=${rootWithChildren.id}`,
            );
        });

        // page=1 is the default and gets stripped by stripSearchParams
        expect(router.state.location.searchStr).not.toContain("page=");
    });

    it("7 — go-to from search (keyboard): ArrowDown focuses matching treeitem, Enter clears search and selects node", async () => {
        const user = userEvent.setup();
        const total = db.products.length;
        await renderWithRouter("/catalog");
        await screen.findByText(countLabel(total));
        await waitForTreeLoaded();

        const ancestorIds = getAncestorIds(deepestCategory.id);
        const roots = db.categories.filter((c) => c.parentId === null);

        // Find a prefix of the deep category's name that matches no ancestor
        let searchTerm = "";
        for (let len = 1; len <= deepestCategory.name.length; len++) {
            const candidate = deepestCategory.name.slice(0, len).toLowerCase();
            const hitsAncestor = ancestorIds.some((aid) => {
                const anc = db.categories.find((c) => c.id === aid);
                return anc?.name.toLowerCase().includes(candidate) ?? false;
            });
            if (!hitsAncestor) {
                searchTerm = candidate;
                break;
            }
        }
        if (!searchTerm)
            throw new Error(
                `Cannot find unique prefix for "${deepestCategory.name}"`,
            );

        const searchInput = screen.getByRole("searchbox", {
            name: /search categories/i,
        });
        await user.type(searchInput, searchTerm);

        // Wait for the filtered tree to include the deep category
        await waitFor(() => {
            const treeEl = screen.getByRole("tree");
            expect(
                treeEl.querySelector(
                    `[data-category-id="${deepestCategory.id}"]`,
                ),
            ).toBeInTheDocument();
        });

        // ArrowDown from the input → first match (not an ancestor) gets focus
        await user.keyboard("{ArrowDown}");
        await waitFor(() => {
            expect(
                document.activeElement?.getAttribute("data-category-id"),
            ).toBe(deepestCategory.id);
        });

        // Enter → search cleared, full tree back, node selected and focused, ancestors expanded, h2 matches
        await user.keyboard("{Enter}");

        await screen.findByRole("heading", {
            level: 2,
            name: deepestCategory.name,
        });

        const treeEl = screen.getByRole("tree");

        // All root treeitems present (search is fully cleared)
        await waitFor(() => {
            for (const root of roots) {
                expect(
                    treeEl.querySelector(`[data-category-id="${root.id}"]`),
                ).toBeInTheDocument();
            }
        });

        // Search input is empty
        expect(searchInput).toHaveValue("");

        // Deep node is selected and focused
        const deepItem = getTreeitem(treeEl, deepestCategory.id);
        expect(deepItem).toHaveAttribute("aria-selected", "true");
        expect(deepItem).toHaveFocus();

        // Ancestors are expanded
        for (const ancestorId of ancestorIds) {
            const el = treeEl.querySelector(
                `[data-category-id="${ancestorId}"]`,
            );
            expect(el).toBeInTheDocument();
            expect(el).toHaveAttribute("aria-expanded", "true");
        }
    });

    it("8 — go-to from search (mouse): click matching row clears search and selects node", async () => {
        const user = userEvent.setup();
        const total = db.products.length;
        await renderWithRouter("/catalog");
        await screen.findByText(countLabel(total));
        await waitForTreeLoaded();

        const ancestorIds = getAncestorIds(deepestCategory.id);
        const roots = db.categories.filter((c) => c.parentId === null);

        // Same unique-prefix logic as case 7
        let searchTerm = "";
        for (let len = 1; len <= deepestCategory.name.length; len++) {
            const candidate = deepestCategory.name.slice(0, len).toLowerCase();
            const hitsAncestor = ancestorIds.some((aid) => {
                const anc = db.categories.find((c) => c.id === aid);
                return anc?.name.toLowerCase().includes(candidate) ?? false;
            });
            if (!hitsAncestor) {
                searchTerm = candidate;
                break;
            }
        }
        if (!searchTerm)
            throw new Error(
                `Cannot find unique prefix for "${deepestCategory.name}"`,
            );

        const searchInput = screen.getByRole("searchbox", {
            name: /search categories/i,
        });
        await user.type(searchInput, searchTerm);

        // Wait for the deep category to appear in the filtered tree
        await waitFor(() => {
            const treeEl = screen.getByRole("tree");
            expect(
                treeEl.querySelector(
                    `[data-category-id="${deepestCategory.id}"]`,
                ),
            ).toBeInTheDocument();
        });

        // Click the matching treeitem's row div (onClick is on the inner div, not the li)
        const treeEl = screen.getByRole("tree");
        await user.click(getTreeitemRow(treeEl, deepestCategory.id));

        // Same end state as case 7: search cleared, full tree, node selected, ancestors expanded, h2
        await screen.findByRole("heading", {
            level: 2,
            name: deepestCategory.name,
        });

        const updatedTreeEl = screen.getByRole("tree");

        await waitFor(() => {
            for (const root of roots) {
                expect(
                    updatedTreeEl.querySelector(
                        `[data-category-id="${root.id}"]`,
                    ),
                ).toBeInTheDocument();
            }
        });

        expect(searchInput).toHaveValue("");

        const deepItem = getTreeitem(updatedTreeEl, deepestCategory.id);
        expect(deepItem).toHaveAttribute("aria-selected", "true");

        for (const ancestorId of ancestorIds) {
            const el = updatedTreeEl.querySelector(
                `[data-category-id="${ancestorId}"]`,
            );
            expect(el).toBeInTheDocument();
            expect(el).toHaveAttribute("aria-expanded", "true");
        }
    });
});
