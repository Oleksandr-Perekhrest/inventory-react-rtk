// outsource dependencies
import userEvent from "@testing-library/user-event";
import { it, vi, expect, describe, beforeAll } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";

// local dependencies
import { MoveToCategoryDialog } from "./MoveToCategoryDialog";

// jsdom does not implement scrollIntoView; stub it globally for this file
beforeAll(() => {
    Element.prototype.scrollIntoView = () => {};
});

type Opt = {
    id: string | null;
    name: string;
    depth: number;
    disabled: boolean;
    current: boolean;
};

// Options fixture:
//   idx 0 — Top level (disabled, current)   id=null
//   idx 1 — Alpha     (enabled)              ← first enabled → initial active
//   idx 2 — Beta      (disabled)
//   idx 3 — Gamma     (enabled)
const OPTIONS: Opt[] = [
    { id: null, name: "Top level", depth: 0, disabled: true, current: true },
    { id: "cat-a", name: "Alpha", depth: 1, disabled: false, current: false },
    { id: "cat-b", name: "Beta", depth: 2, disabled: true, current: false },
    { id: "cat-c", name: "Gamma", depth: 1, disabled: false, current: false },
];

function renderDialog({
    open = true,
    options = OPTIONS,
    onSelect = vi.fn(() => {}),
    onOpenChange = vi.fn(() => {}),
}: {
    open?: boolean;
    options?: Opt[];
    onSelect?: (id: string | null) => void;
    onOpenChange?: (open: boolean) => void;
} = {}) {
    return render(
        <MoveToCategoryDialog
            open={open}
            onOpenChange={onOpenChange}
            title="Move product"
            description="Choose a category"
            options={options}
            onSelect={onSelect}
        />,
    );
}

describe("MoveToCategoryDialog — ARIA (test 6)", () => {
    it("dialog title/description; combobox aria-controls listbox; aria-activedescendant on first enabled; disabled have aria-disabled; current shows (current)", () => {
        renderDialog();

        const dialog = screen.getByRole("dialog", { name: "Move product" });
        expect(dialog).toHaveAccessibleDescription("Choose a category");

        const combobox = screen.getByRole("combobox");
        const listbox = screen.getByRole("listbox");
        expect(combobox).toHaveAttribute("aria-controls", listbox.id);

        // aria-activedescendant points to Alpha (first enabled, idx 1)
        const activeId = combobox.getAttribute("aria-activedescendant") ?? "";
        expect(activeId).not.toBe("");
        const activeEl = document.getElementById(activeId);
        expect(activeEl).toHaveTextContent("Alpha");
        expect(activeEl).toHaveAttribute("aria-selected", "true");

        // Disabled options have aria-disabled="true"
        const topLevelOpt = screen.getByRole("option", { name: /Top level/i });
        expect(topLevelOpt).toHaveAttribute("aria-disabled", "true");
        const betaOpt = screen.getByRole("option", { name: "Beta" });
        expect(betaOpt).toHaveAttribute("aria-disabled", "true");

        // Current option shows "(current)"
        expect(topLevelOpt).toHaveTextContent("(current)");
    });
});

describe("MoveToCategoryDialog — Keyboard (test 7)", () => {
    it("ArrowDown skips disabled options", async () => {
        const user = userEvent.setup();
        renderDialog();

        const combobox = screen.getByRole("combobox");
        await user.click(combobox);

        // Active is Alpha (idx 1). ArrowDown skips Beta (disabled) → Gamma (idx 3).
        await user.keyboard("{ArrowDown}");

        await waitFor(() => {
            expect(
                screen.getByRole("option", { name: "Gamma" }),
            ).toHaveAttribute("aria-selected", "true");
        });
        expect(screen.getByRole("option", { name: "Alpha" })).toHaveAttribute(
            "aria-selected",
            "false",
        );
    });

    it("ArrowUp at the first enabled option stays", async () => {
        const user = userEvent.setup();
        renderDialog();

        const combobox = screen.getByRole("combobox");
        await user.click(combobox);

        // Active is Alpha (idx 1). ArrowUp: idx 0 is disabled, idx -1 out of bounds → no move.
        await user.keyboard("{ArrowUp}");

        expect(screen.getByRole("option", { name: "Alpha" })).toHaveAttribute(
            "aria-selected",
            "true",
        );
    });

    it("Enter calls onSelect with the active id and onOpenChange(false)", async () => {
        const user = userEvent.setup();
        const onSelect = vi.fn<(id: string | null) => void>();
        const onOpenChange = vi.fn<(open: boolean) => void>();
        renderDialog({ onSelect, onOpenChange });

        const combobox = screen.getByRole("combobox");
        await user.click(combobox);

        // Active is Alpha (cat-a). Enter should select it.
        await user.keyboard("{Enter}");

        expect(onSelect).toHaveBeenCalledWith("cat-a");
        expect(onOpenChange).toHaveBeenCalledWith(false);
        expect(onSelect).toHaveBeenCalledTimes(1);
    });

    it("Enter on a list where everything is disabled calls nothing", async () => {
        const user = userEvent.setup();
        const onSelect = vi.fn<(id: string | null) => void>();
        const onOpenChange = vi.fn<(open: boolean) => void>();
        const allDisabled: Opt[] = [
            { id: "cat-x", name: "X", depth: 1, disabled: true, current: true },
            {
                id: "cat-y",
                name: "Y",
                depth: 1,
                disabled: true,
                current: false,
            },
        ];
        renderDialog({ options: allDisabled, onSelect, onOpenChange });

        const combobox = screen.getByRole("combobox");
        await user.click(combobox);
        await user.keyboard("{Enter}");

        expect(onSelect).not.toHaveBeenCalled();
        expect(onOpenChange).not.toHaveBeenCalled();
    });
});

describe("MoveToCategoryDialog — Filtering (test 8)", () => {
    it("typing narrows list; active becomes first enabled match; no match shows status element", async () => {
        const user = userEvent.setup();
        const searchable: Opt[] = [
            {
                id: "cat-a",
                name: "Alpha",
                depth: 1,
                disabled: false,
                current: false,
            },
            {
                id: "cat-b",
                name: "Beta",
                depth: 1,
                disabled: false,
                current: false,
            },
            {
                id: "cat-c",
                name: "Gamma",
                depth: 1,
                disabled: false,
                current: false,
            },
        ];
        renderDialog({ options: searchable });

        const combobox = screen.getByRole("combobox");
        await user.click(combobox);

        // Type to narrow: "al" matches only Alpha
        await user.type(combobox, "al");

        await waitFor(() => {
            expect(
                screen.getByRole("option", { name: "Alpha" }),
            ).toBeInTheDocument();
            expect(
                screen.queryByRole("option", { name: "Beta" }),
            ).not.toBeInTheDocument();
            expect(
                screen.queryByRole("option", { name: "Gamma" }),
            ).not.toBeInTheDocument();
        });

        // Alpha is the first (and only) enabled match → active
        expect(screen.getByRole("option", { name: "Alpha" })).toHaveAttribute(
            "aria-selected",
            "true",
        );

        // No matches → status element
        await user.clear(combobox);
        await user.type(combobox, "xyz");

        await waitFor(() => {
            expect(screen.getByRole("status")).toHaveTextContent(
                "No categories match",
            );
        });
        expect(screen.queryByRole("listbox")).not.toBeInTheDocument();
    });
});

describe("MoveToCategoryDialog — Reopening (test 9)", () => {
    it("reopening resets the query and the active option", async () => {
        const user = userEvent.setup();
        const { rerender } = renderDialog();

        const combobox = screen.getByRole("combobox");
        await user.click(combobox);

        // Type something to dirty the query
        await user.type(combobox, "al");
        await waitFor(() => {
            expect(
                screen.queryByRole("option", { name: "Beta" }),
            ).not.toBeInTheDocument();
        });

        // Close
        rerender(
            <MoveToCategoryDialog
                open={false}
                onOpenChange={vi.fn(() => {})}
                title="Move product"
                description="Choose a category"
                options={OPTIONS}
                onSelect={vi.fn(() => {})}
            />,
        );

        // Reopen
        rerender(
            <MoveToCategoryDialog
                open={true}
                onOpenChange={vi.fn(() => {})}
                title="Move product"
                description="Choose a category"
                options={OPTIONS}
                onSelect={vi.fn(() => {})}
            />,
        );

        // Query resets to ""
        const combobox2 = screen.getByRole("combobox");
        expect(combobox2).toHaveValue("");

        // All options visible again, Alpha is active (first enabled)
        await waitFor(() => {
            expect(
                screen.getByRole("option", { name: "Alpha" }),
            ).toHaveAttribute("aria-selected", "true");
        });
        expect(
            screen.getByRole("option", { name: "Beta" }),
        ).toBeInTheDocument();
        expect(
            screen.getByRole("option", { name: "Gamma" }),
        ).toBeInTheDocument();
    });
});
