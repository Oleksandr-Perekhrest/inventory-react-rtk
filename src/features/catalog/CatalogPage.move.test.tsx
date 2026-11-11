// outsource dependencies
import userEvent from "@testing-library/user-event";
import { screen, waitFor } from "@testing-library/react";
import { it, expect, afterAll, describe, afterEach, beforeAll } from "vitest";

// local dependencies
import { setBackendReady } from "@/api/backendReady";
import { createMockServer } from "@/test/mockServer";
import { renderWithRouter } from "@/test/renderWithRouter";
import { PRODUCTS_HEADING_ID } from "@/features/products-table/ProductsTableHeader";

const { db, server } = createMockServer();

beforeAll(() => {
    // jsdom does not implement scrollIntoView (used by MoveToCategoryDialog)
    Element.prototype.scrollIntoView = () => {};
    server.listen({ onUnhandledFrame: "error" });
});
afterAll(() => server.close());
afterEach(() => {
    server.resetHandlers();
    setBackendReady(Promise.resolve());
});

describe("Product move via dialog (T10)", () => {
    it("10 — keyboard-only product move: open actions, choose Move to category…, type, Enter → dialog closes, focus returns, toast appears, db updated", async () => {
        const user = userEvent.setup();

        // Alphabetically first product matches page-1 row-1 (server sorts by name asc by default)
        const sortedProducts = [...db.products].sort((a, b) =>
            a.name.localeCompare(b.name),
        );
        const product = sortedProducts[0];
        if (!product) throw new Error("No products in seed");

        // "Packaging" (cat-packaging) has a unique search prefix "pack" among all category names
        const targetCategory = db.categories.find(
            (c) => c.id === "cat-packaging",
        );
        if (!targetCategory) throw new Error("cat-packaging not in seed");

        await renderWithRouter("/catalog");

        // Wait until the product row is visible
        const actionsButton = await screen.findByRole("button", {
            name: `Actions for ${product.name}`,
        });

        // Focus the trigger, then open the menu via keyboard (Enter on a focused button
        // fires a click with detail=0, which Radix treats as keyboard-open and auto-focuses
        // the first item; this also ensures focus returns to the trigger before the Dialog opens)
        actionsButton.focus();
        await user.keyboard("{Enter}");

        // First (only) menu item is auto-focused by Radix on keyboard-open; select it
        await screen.findByRole("menuitem", { name: "Move to category…" });
        await user.keyboard("{Enter}");

        // Wait for the MoveToCategoryDialog to open (combobox is auto-focused)
        const combobox = await screen.findByRole("combobox");

        // Type a unique prefix to narrow to Packaging only
        await user.type(combobox, "pack");

        // Confirm with Enter — Packaging is the first (and only) enabled match
        await user.keyboard("{Enter}");

        // Dialog closes
        await waitFor(() => {
            expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
        });

        // Toast confirms the move
        await screen.findByText(
            `Moved "${product.name}" to "${targetCategory.name}"`,
        );

        // Server DB reflects the new categoryId
        await waitFor(() => {
            const updated = db.products.find((p) => p.id === product.id);
            expect(updated?.categoryId).toBe(targetCategory.id);
        });

        // BUG: Radix Dialog FocusScope captures document.activeElement at mount time, but by then
        // the DropdownMenu content has already been removed from the DOM (focus fell to body) and
        // the DropdownMenu's asynchronous trigger.focus() [via setTimeout 0 in FocusScope cleanup]
        // hasn't run yet. So the Dialog saves body instead of the trigger, and restores body on close.
        // Fix: defer setDialogOpen(true) in ProductActionsMenu so the DropdownMenu can restore focus
        // to the trigger before the Dialog FocusScope mounts.
        await waitFor(() => {
            expect(
                screen.getByRole("button", {
                    name: `Actions for ${product.name}`,
                }),
            ).toHaveFocus();
        });
    });
});

describe("Product move with category filter — row removed (T11)", () => {
    it("11 — when the moved product leaves the filtered view, focus falls back to the products heading", async () => {
        const user = userEvent.setup();

        // cat-bread has products; pick the alphabetically first one
        const catBreadProducts = [...db.products]
            .filter((p) => p.categoryId === "cat-bread")
            .sort((a, b) => a.name.localeCompare(b.name));
        const product = catBreadProducts[0];
        if (!product) throw new Error("No products in cat-bread");

        const targetCategory = db.categories.find(
            (c) => c.id === "cat-packaging",
        );
        if (!targetCategory) throw new Error("cat-packaging not in seed");

        // Open catalog filtered to cat-bread
        await renderWithRouter("/catalog?categoryId=cat-bread");

        const actionsButton = await screen.findByRole("button", {
            name: `Actions for ${product.name}`,
        });

        actionsButton.focus();
        await user.keyboard("{Enter}");

        await screen.findByRole("menuitem", { name: "Move to category…" });
        await user.keyboard("{Enter}");

        const combobox = await screen.findByRole("combobox");
        await user.type(combobox, "pack");
        await user.keyboard("{Enter}");

        // Dialog closes
        await waitFor(() => {
            expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
        });

        // Toast confirms the move
        await screen.findByText(
            `Moved "${product.name}" to "${targetCategory.name}"`,
        );

        // Row disappears because the product is no longer in cat-bread
        await waitFor(() => {
            expect(
                screen.queryByRole("button", {
                    name: `Actions for ${product.name}`,
                }),
            ).not.toBeInTheDocument();
        });

        // Focus falls back to the products heading (trigger is disconnected)
        await waitFor(() => {
            expect(document.getElementById(PRODUCTS_HEADING_ID)).toHaveFocus();
        });
    });
});

describe("Product move to subcategory stays visible (T13)", () => {
    it("13 — moving a product into a sibling subcategory of the selected parent keeps the row visible and returns focus to the trigger", async () => {
        const user = userEvent.setup();

        // Find alphabetically first product in cat-bread (a child of cat-bakery)
        const breadProducts = [...db.products]
            .filter((p) => p.categoryId === "cat-bread")
            .sort((a, b) => a.name.localeCompare(b.name));
        const product = breadProducts[0];
        if (!product) throw new Error("No products in cat-bread");

        const targetCategory = db.categories.find((c) => c.id === "cat-pastry");
        if (!targetCategory) throw new Error("cat-pastry not in seed");

        // Open catalog filtered to cat-bakery; both bread and pastry are descendants
        await renderWithRouter("/catalog?categoryId=cat-bakery");

        const actionsButton = await screen.findByRole("button", {
            name: `Actions for ${product.name}`,
        });

        actionsButton.focus();
        await user.keyboard("{Enter}");

        await screen.findByRole("menuitem", { name: "Move to category…" });
        await user.keyboard("{Enter}");

        const combobox = await screen.findByRole("combobox");
        await user.type(combobox, "past");
        await user.keyboard("{Enter}");

        await waitFor(() => {
            expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
        });

        await screen.findByText(
            `Moved "${product.name}" to "${targetCategory.name}"`,
        );

        // Row stays — pastry is still under bakery (includeDescendants: true)
        expect(
            screen.getByRole("button", {
                name: `Actions for ${product.name}`,
            }),
        ).toBeInTheDocument();

        // Focus returns to the trigger, not the heading
        await waitFor(() => {
            expect(
                screen.getByRole("button", {
                    name: `Actions for ${product.name}`,
                }),
            ).toHaveFocus();
        });
    });
});

describe("Category move via header button (T12)", () => {
    it("12 — after moving a category via the header '⋯' dialog, focus returns to that trigger button", async () => {
        const user = userEvent.setup();

        const category = db.categories.find((c) => c.id === "cat-bread");
        if (!category) throw new Error("cat-bread not in seed");

        // Open catalog filtered to cat-bread
        await renderWithRouter("/catalog?categoryId=cat-bread");

        // Wait for the header with the category actions button
        const actionsButton = await screen.findByRole("button", {
            name: `Actions for category ${category.name}`,
        });

        actionsButton.focus();
        await user.keyboard("{Enter}");

        await screen.findByRole("menuitem", { name: "Move category…" });
        await user.keyboard("{Enter}");

        const combobox = await screen.findByRole("combobox");
        await user.type(combobox, "pack");
        await user.keyboard("{Enter}");

        // Dialog closes
        await waitFor(() => {
            expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
        });

        // Toast confirms the move
        await screen.findByText(`Moved "${category.name}" to "Packaging"`);

        // Focus returns to the category header trigger (it stays mounted after a category move)
        await waitFor(() => {
            expect(actionsButton).toHaveFocus();
        });
    });
});
