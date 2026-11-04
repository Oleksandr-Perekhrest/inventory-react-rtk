// outsource dependencies
import { it, expect, describe } from "vitest";
import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

// local dependencies
import { renderWithRouter } from "@/test/renderWithRouter";

describe("AppSidebar navigation", () => {
    it('"/" redirects to /catalog and shows the Catalog heading', async () => {
        await renderWithRouter("/");
        expect(
            await screen.findByRole("heading", { name: /catalog/i }),
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
        await renderWithRouter("/catalog");
        expect(screen.getByRole("link", { name: /catalog/i })).toHaveAttribute(
            "aria-current",
            "page",
        );
        expect(
            screen.getByRole("link", { name: /movements/i }),
        ).not.toHaveAttribute("aria-current", "page");
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
