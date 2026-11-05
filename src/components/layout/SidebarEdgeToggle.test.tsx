// outsource dependencies
import { it, expect, describe } from "vitest";
import userEvent from "@testing-library/user-event";
import { screen, waitFor } from "@testing-library/react";

// local dependencies
import { renderWithRouter } from "@/test/renderWithRouter";

describe("SidebarEdgeToggle", () => {
    it("initially the button is 'Collapse sidebar', aria-expanded=true, and the sidebar is expanded", async () => {
        await renderWithRouter("/catalog");
        const toggle = screen.getByRole("button", { name: "Collapse sidebar" });
        expect(toggle).toHaveAttribute("aria-expanded", "true");
        expect(document.querySelector('[data-slot="sidebar"]')).toHaveAttribute(
            "data-state",
            "expanded",
        );
    });

    it("after a click the sidebar collapses and nav links are still accessible", async () => {
        const user = userEvent.setup();
        await renderWithRouter("/catalog");
        await user.click(
            screen.getByRole("button", { name: "Collapse sidebar" }),
        );
        await waitFor(() => {
            expect(
                screen.getByRole("button", { name: "Expand sidebar" }),
            ).toHaveAttribute("aria-expanded", "false");
            expect(
                document.querySelector('[data-slot="sidebar"]'),
            ).toHaveAttribute("data-state", "collapsed");
        });
        expect(
            screen.getByRole("link", { name: /catalog/i }),
        ).toBeInTheDocument();
        expect(
            screen.getByRole("link", { name: /movements/i }),
        ).toBeInTheDocument();
    });

    it("a second click restores the expanded state", async () => {
        const user = userEvent.setup();
        await renderWithRouter("/catalog");
        await user.click(
            screen.getByRole("button", { name: "Collapse sidebar" }),
        );
        await screen.findByRole("button", { name: "Expand sidebar" });
        await user.click(
            screen.getByRole("button", { name: "Expand sidebar" }),
        );
        await waitFor(() => {
            expect(
                screen.getByRole("button", { name: "Collapse sidebar" }),
            ).toHaveAttribute("aria-expanded", "true");
            expect(
                document.querySelector('[data-slot="sidebar"]'),
            ).toHaveAttribute("data-state", "expanded");
        });
    });
});
