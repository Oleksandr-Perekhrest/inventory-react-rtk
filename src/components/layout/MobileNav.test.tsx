// outsource dependencies
import { it, expect, describe } from "vitest";
import userEvent from "@testing-library/user-event";
import { within, screen, waitFor } from "@testing-library/react";

// local dependencies
import { renderWithRouter } from "@/test/renderWithRouter";

function getMobileBreadcrumb() {
    // The "Open menu" button lives in the same inner div as the breadcrumb nav.
    // Scoping through its parentElement isolates our breadcrumb from any
    // page-level <nav aria-label="Breadcrumb"> elements on a given page.
    const mobileBar = screen.getByRole("button", {
        name: "Open menu",
    }).parentElement!;
    return within(mobileBar).getByRole("navigation", { name: "Breadcrumb" });
}

describe("MobileNav breadcrumb", () => {
    it("on /catalog shows Catalog with aria-current='page' and Warehouse Manager is accessible", async () => {
        await renderWithRouter("/catalog");
        const breadcrumb = getMobileBreadcrumb();
        expect(
            within(breadcrumb).getByText("Warehouse Manager"),
        ).toBeInTheDocument();
        expect(within(breadcrumb).getByText("Catalog")).toHaveAttribute(
            "aria-current",
            "page",
        );
    });

    it("on /movements shows Movements with aria-current='page' and not Catalog", async () => {
        await renderWithRouter("/movements");
        const breadcrumb = getMobileBreadcrumb();
        expect(within(breadcrumb).getByText("Movements")).toHaveAttribute(
            "aria-current",
            "page",
        );
        expect(
            within(breadcrumb).queryByText("Catalog"),
        ).not.toBeInTheDocument();
    });

    it("on an unknown path has no current section in the breadcrumb", async () => {
        await renderWithRouter("/unknown-path");
        const breadcrumb = getMobileBreadcrumb();
        expect(breadcrumb.querySelector('[aria-current="page"]')).toBeNull();
    });
});

describe("MobileNav sheet", () => {
    it("'Open menu' opens a dialog with all four links; the current one has aria-current='page'", async () => {
        const user = userEvent.setup();
        await renderWithRouter("/catalog");
        await user.click(screen.getByRole("button", { name: "Open menu" }));
        const dialog = await screen.findByRole("dialog");
        const catalogLink = within(dialog).getByRole("link", {
            name: /catalog/i,
        });
        expect(catalogLink).toHaveAttribute("aria-current", "page");
        expect(
            within(dialog).getByRole("link", { name: /receiving/i }),
        ).not.toHaveAttribute("aria-current", "page");
        expect(
            within(dialog).getByRole("link", { name: /movements/i }),
        ).not.toHaveAttribute("aria-current", "page");
        expect(
            within(dialog).getByRole("link", { name: /dashboard/i }),
        ).not.toHaveAttribute("aria-current", "page");
    });

    it("clicking 'Receiving' in the dialog navigates and closes the dialog", async () => {
        const user = userEvent.setup();
        await renderWithRouter("/catalog");
        await user.click(screen.getByRole("button", { name: "Open menu" }));
        const dialog = await screen.findByRole("dialog");
        await user.click(
            within(dialog).getByRole("link", { name: /receiving/i }),
        );
        await waitFor(() =>
            expect(screen.queryByRole("dialog")).not.toBeInTheDocument(),
        );
        expect(
            await screen.findByRole("heading", { name: /receiving/i }),
        ).toBeVisible();
    });

    it("'Close menu' closes the dialog without navigating", async () => {
        const user = userEvent.setup();
        await renderWithRouter("/catalog");
        await user.click(screen.getByRole("button", { name: "Open menu" }));
        const dialog = await screen.findByRole("dialog");
        await user.click(
            within(dialog).getByRole("button", { name: "Close menu" }),
        );
        await waitFor(() =>
            expect(screen.queryByRole("dialog")).not.toBeInTheDocument(),
        );
        expect(
            await screen.findByRole("heading", { name: /catalog/i }),
        ).toBeVisible();
    });
});
