// outsource dependencies
import { it, expect, describe } from "vitest";
import userEvent from "@testing-library/user-event";
import { screen, waitFor } from "@testing-library/react";

// local dependencies
import { renderWithRouter } from "@/test/renderWithRouter";

describe("AppSidebar navigation", () => {
    it('"/" shows the Welcome page heading', async () => {
        await renderWithRouter("/");
        expect(
            await screen.findByRole("heading", { name: /warehouse manager/i }),
        ).toBeVisible();
    });

    it('clicking "Movements" in the sidebar shows the Movements heading', async () => {
        const user = userEvent.setup();
        await renderWithRouter("/catalog");
        await user.click(screen.getByRole("link", { name: /movements/i }));
        expect(
            await screen.findByRole("heading", { name: /movements/i }),
        ).toBeVisible();
    });

    it("the current page nav link is marked active and others are not", async () => {
        const user = userEvent.setup();
        await renderWithRouter("/catalog");

        const catalogLink = screen.getByRole("link", { name: /catalog/i });
        const movementsLink = screen.getByRole("link", { name: /movements/i });

        expect(catalogLink).toHaveAttribute("aria-current", "page");
        expect(catalogLink).toHaveAttribute("data-active", "true");
        expect(movementsLink).not.toHaveAttribute("aria-current", "page");
        expect(movementsLink).not.toHaveAttribute("data-active", "true");

        await user.click(movementsLink);

        await waitFor(() => {
            expect(
                screen.getByRole("link", { name: /movements/i }),
            ).toHaveAttribute("data-active", "true");
            expect(
                screen.getByRole("link", { name: /catalog/i }),
            ).not.toHaveAttribute("data-active", "true");
        });
    });

    it("an unknown path shows the not-found message and its link leads to Catalog", async () => {
        const user = userEvent.setup();
        await renderWithRouter("/unknown-route");
        expect(await screen.findByText(/page not found/i)).toBeVisible();
        await user.click(screen.getByRole("link", { name: /go to catalog/i }));
        expect(
            await screen.findByRole("heading", { name: /catalog/i }),
        ).toBeVisible();
    });
});
