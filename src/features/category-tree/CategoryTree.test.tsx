// outsource dependencies
import { Provider } from "react-redux";
import { http, HttpResponse } from "msw";
import userEvent from "@testing-library/user-event";
import { render, screen, waitFor } from "@testing-library/react";
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
import { makeStore } from "@/store/store";
import { CategoryTree } from "./CategoryTree";
import { setBackendReady } from "@/api/backendReady";
import { createMockServer } from "@/test/mockServer";

// 7 categories, 3 levels; array order ≠ position order to exercise sorting
const CATEGORIES = [
    {
        id: "cat-1",
        name: "Electronics",
        parentId: null,
        position: 2,
        productCount: 2,
        totalProductCount: 10,
    },
    {
        id: "cat-2",
        name: "Furniture",
        parentId: null,
        position: 1,
        productCount: 5,
        totalProductCount: 7,
    },
    {
        id: "cat-3",
        name: "Tools",
        parentId: null,
        position: 3,
        productCount: 8,
        totalProductCount: 8,
    },
    {
        id: "cat-4",
        name: "Computers",
        parentId: "cat-1",
        position: 2,
        productCount: 3,
        totalProductCount: 6,
    },
    {
        id: "cat-5",
        name: "Phones",
        parentId: "cat-1",
        position: 1,
        productCount: 4,
        totalProductCount: 4,
    },
    {
        id: "cat-6",
        name: "Laptops",
        parentId: "cat-4",
        position: 1,
        productCount: 3,
        totalProductCount: 3,
    },
    {
        id: "cat-7",
        name: "Chairs",
        parentId: "cat-2",
        position: 1,
        productCount: 2,
        totalProductCount: 2,
    },
];

const { server } = createMockServer();

function categoriesHandler() {
    return http.get("/api/categories", () => HttpResponse.json(CATEGORIES));
}

function renderTree() {
    return render(
        <Provider store={makeStore()}>
            <CategoryTree />
        </Provider>,
    );
}

beforeAll(() =>
    server.listen({ onUnhandledFrame: "error" } as Parameters<
        typeof server.listen
    >[0]),
);
afterAll(() => server.close());

afterEach(() => {
    server.resetHandlers();
    setBackendReady(Promise.resolve());
});

describe("Rendering and expand", () => {
    beforeEach(() => {
        server.use(categoriesHandler());
    });

    it("renders root categories in position order with their counts", async () => {
        renderTree();

        const items = await screen.findAllByRole("treeitem");
        expect(items).toHaveLength(3);
        expect(items[0]).toHaveTextContent("Furniture");
        expect(items[0]).toHaveTextContent("7");
        expect(items[1]).toHaveTextContent("Electronics");
        expect(items[1]).toHaveTextContent("10");
        expect(items[2]).toHaveTextContent("Tools");
        expect(items[2]).toHaveTextContent("8");
    });

    it("does not render children before the parent is expanded", async () => {
        renderTree();

        await screen.findAllByRole("treeitem");

        expect(
            screen.queryByRole("treeitem", { name: /Phones/i }),
        ).not.toBeInTheDocument();
        expect(
            screen.queryByRole("treeitem", { name: /Computers/i }),
        ).not.toBeInTheDocument();
        expect(
            screen.queryByRole("treeitem", { name: /Chairs/i }),
        ).not.toBeInTheDocument();
    });

    it("clicking the chevron sets aria-expanded='true' and shows children", async () => {
        const user = userEvent.setup();
        renderTree();

        const electronicsItem = await screen.findByRole("treeitem", {
            name: /Electronics/i,
        });
        expect(electronicsItem).toHaveAttribute("aria-expanded", "false");

        await user.click(electronicsItem.querySelector("svg")!);

        await waitFor(() => {
            expect(electronicsItem).toHaveAttribute("aria-expanded", "true");
        });
        expect(screen.getByText("Phones")).toBeInTheDocument();
        expect(screen.getByText("Computers")).toBeInTheDocument();
    });

    it("clicking the chevron again collapses the parent and hides children", async () => {
        const user = userEvent.setup();
        renderTree();

        const electronicsItem = await screen.findByRole("treeitem", {
            name: /Electronics/i,
        });
        const chevron = electronicsItem.querySelector("svg")!;

        await user.click(chevron);
        await screen.findByText("Phones");

        await user.click(chevron);

        await waitFor(() => {
            expect(electronicsItem).toHaveAttribute("aria-expanded", "false");
            expect(screen.queryByText("Phones")).not.toBeInTheDocument();
        });
    });
});

describe("Search filter", () => {
    beforeEach(() => {
        server.use(categoriesHandler());
    });

    it("shows only matches and ancestors, highlights the match in a mark, and updates the live region", async () => {
        const user = userEvent.setup();
        renderTree();

        // Expand Furniture first — unrelated to the "comp" search path
        const furnitureItem = await screen.findByRole("treeitem", {
            name: /Furniture/i,
        });
        await user.click(furnitureItem.querySelector("svg")!);
        await screen.findByText("Chairs");

        await user.type(
            screen.getByRole("searchbox", { name: /search categories/i }),
            "comp",
        );

        // Only Electronics (ancestor) and Computers (match) are visible
        await waitFor(() => {
            expect(screen.queryByText("Furniture")).not.toBeInTheDocument();
        });
        expect(screen.queryByText("Tools")).not.toBeInTheDocument();
        expect(screen.queryByText("Chairs")).not.toBeInTheDocument();
        expect(screen.queryByText("Phones")).not.toBeInTheDocument();
        expect(screen.getByText("Electronics")).toBeInTheDocument();

        expect(screen.getByRole("status")).toHaveTextContent(
            "1 category found",
        );

        // "Comp" (the matched portion) is wrapped in a <mark> element
        const mark = document.querySelector("mark");
        expect(mark).toBeInTheDocument();
        expect(mark).toHaveTextContent("Comp");
    });

    it("pressing Escape restores the full tree with the user's earlier expansion intact", async () => {
        const user = userEvent.setup();
        renderTree();

        const furnitureItem = await screen.findByRole("treeitem", {
            name: /Furniture/i,
        });
        await user.click(furnitureItem.querySelector("svg")!);
        await screen.findByText("Chairs");

        const input = screen.getByRole("searchbox", {
            name: /search categories/i,
        });
        await user.type(input, "comp");

        await waitFor(() => {
            expect(screen.queryByText("Furniture")).not.toBeInTheDocument();
        });

        await user.keyboard("{Escape}");

        // Furniture stays expanded (Chairs visible); Electronics stays collapsed
        await screen.findByText("Chairs");
        expect(
            screen.getByRole("treeitem", { name: /Furniture/i }),
        ).toBeInTheDocument();
        expect(
            screen.getByRole("treeitem", { name: /Electronics/i }),
        ).toHaveAttribute("aria-expanded", "false");
        expect(
            screen.queryByRole("treeitem", { name: /Phones/i }),
        ).not.toBeInTheDocument();
    });
});

describe("No matches", () => {
    beforeEach(() => {
        server.use(categoriesHandler());
    });

    it("shows 'No categories match' with the query and hides the tree", async () => {
        const user = userEvent.setup();
        renderTree();

        await screen.findAllByRole("treeitem");

        await user.type(
            screen.getByRole("searchbox", { name: /search categories/i }),
            "zzz",
        );

        await screen.findByText('No categories match "zzz"');
        expect(screen.queryByRole("tree")).not.toBeInTheDocument();
    });
});

describe("Clear button", () => {
    beforeEach(() => {
        server.use(categoriesHandler());
    });

    it("does not appear when the input is empty", async () => {
        renderTree();

        await screen.findAllByRole("treeitem");

        expect(
            screen.queryByRole("button", { name: /clear search/i }),
        ).not.toBeInTheDocument();
    });

    it("appears with text in the input, clears on click, and returns focus to the input", async () => {
        const user = userEvent.setup();
        renderTree();

        await screen.findAllByRole("treeitem");

        const input = screen.getByRole("searchbox", {
            name: /search categories/i,
        });
        await user.type(input, "comp");

        const clearButton = screen.getByRole("button", {
            name: /clear search/i,
        });
        expect(clearButton).toBeInTheDocument();

        await user.click(clearButton);

        expect(
            screen.queryByRole("button", { name: /clear search/i }),
        ).not.toBeInTheDocument();
        expect(input).toHaveFocus();
    });
});

describe("Keyboard navigation", () => {
    beforeEach(() => {
        server.use(categoriesHandler());
    });

    it("Tab from the search input lands on the first tree item", async () => {
        const user = userEvent.setup();
        renderTree();

        const input = screen.getByRole("searchbox", {
            name: /search categories/i,
        });
        await screen.findAllByRole("treeitem");

        await user.click(input);
        await user.tab();

        await waitFor(() => {
            expect(
                screen.getByRole("treeitem", { name: /Furniture/i }),
            ).toHaveFocus();
        });
    });

    it("ArrowDown moves focus to the next item", async () => {
        const user = userEvent.setup();
        renderTree();

        await screen.findAllByRole("treeitem");

        await user.click(
            screen.getByRole("searchbox", { name: /search categories/i }),
        );
        await user.tab();

        await waitFor(() => {
            expect(
                screen.getByRole("treeitem", { name: /Furniture/i }),
            ).toHaveFocus();
        });

        await user.keyboard("{ArrowDown}");

        await waitFor(() => {
            expect(
                screen.getByRole("treeitem", { name: /Electronics/i }),
            ).toHaveFocus();
        });
    });

    it("ArrowRight on a collapsed parent expands it", async () => {
        const user = userEvent.setup();
        renderTree();

        await screen.findAllByRole("treeitem");

        await user.click(
            screen.getByRole("searchbox", { name: /search categories/i }),
        );
        await user.tab();
        await user.keyboard("{ArrowDown}");

        const electronicsItem = screen.getByRole("treeitem", {
            name: /Electronics/i,
        });
        await waitFor(() => expect(electronicsItem).toHaveFocus());

        await user.keyboard("{ArrowRight}");

        await waitFor(() => {
            expect(electronicsItem).toHaveAttribute("aria-expanded", "true");
        });
        expect(screen.getByText("Phones")).toBeInTheDocument();
    });

    it("ArrowLeft on an expanded parent collapses it", async () => {
        const user = userEvent.setup();
        renderTree();

        await screen.findAllByRole("treeitem");

        await user.click(
            screen.getByRole("searchbox", { name: /search categories/i }),
        );
        await user.tab();
        await user.keyboard("{ArrowDown}");

        const electronicsItem = screen.getByRole("treeitem", {
            name: /Electronics/i,
        });
        await waitFor(() => expect(electronicsItem).toHaveFocus());

        await user.keyboard("{ArrowRight}");
        await waitFor(() => {
            expect(electronicsItem).toHaveAttribute("aria-expanded", "true");
        });

        await user.keyboard("{ArrowLeft}");

        await waitFor(() => {
            expect(electronicsItem).toHaveAttribute("aria-expanded", "false");
        });
        expect(
            screen.queryByRole("treeitem", { name: /Phones/i }),
        ).not.toBeInTheDocument();
    });

    it("Home moves focus to the first item and End moves focus to the last item", async () => {
        const user = userEvent.setup();
        renderTree();

        await screen.findAllByRole("treeitem");

        await user.click(
            screen.getByRole("searchbox", { name: /search categories/i }),
        );
        await user.tab();
        await user.keyboard("{ArrowDown}");

        const electronicsItem = screen.getByRole("treeitem", {
            name: /Electronics/i,
        });
        await waitFor(() => expect(electronicsItem).toHaveFocus());

        await user.keyboard("{End}");
        await waitFor(() => {
            expect(
                screen.getByRole("treeitem", { name: /Tools/i }),
            ).toHaveFocus();
        });

        await user.keyboard("{Home}");
        await waitFor(() => {
            expect(
                screen.getByRole("treeitem", { name: /Furniture/i }),
            ).toHaveFocus();
        });
    });

    it("typing a letter focuses the next item whose name starts with that letter", async () => {
        const user = userEvent.setup();
        renderTree();

        await screen.findAllByRole("treeitem");

        await user.click(
            screen.getByRole("searchbox", { name: /search categories/i }),
        );
        await user.tab();

        await waitFor(() => {
            expect(
                screen.getByRole("treeitem", { name: /Furniture/i }),
            ).toHaveFocus();
        });

        await user.keyboard("e");

        await waitFor(() => {
            expect(
                screen.getByRole("treeitem", { name: /Electronics/i }),
            ).toHaveFocus();
        });
    });
});

describe("Error and retry", () => {
    it("shows the error message and a Retry button on a 500 response", async () => {
        server.use(
            http.get("/api/categories", () =>
                HttpResponse.json(
                    {
                        error: {
                            code: "INTERNAL_ERROR",
                            message: "Internal server error",
                        },
                    },
                    { status: 500 },
                ),
            ),
        );

        renderTree();

        await screen.findByText("Internal server error");
        expect(
            screen.getByRole("button", { name: /retry/i }),
        ).toBeInTheDocument();
        expect(screen.queryByRole("tree")).not.toBeInTheDocument();
    });

    it("clicking Retry after the handler is fixed renders the tree", async () => {
        server.use(
            http.get("/api/categories", () =>
                HttpResponse.json(
                    {
                        error: {
                            code: "INTERNAL_ERROR",
                            message: "Internal server error",
                        },
                    },
                    { status: 500 },
                ),
            ),
        );

        const user = userEvent.setup();
        renderTree();

        await screen.findByText("Internal server error");

        server.use(categoriesHandler());

        await user.click(screen.getByRole("button", { name: /retry/i }));

        await screen.findByRole("treeitem", { name: /Furniture/i });
        expect(
            screen.queryByText("Internal server error"),
        ).not.toBeInTheDocument();
    });
});
