// outsource dependencies
import userEvent from "@testing-library/user-event";
import { screen, waitFor } from "@testing-library/react";
import { it, expect, describe, afterAll, afterEach, beforeAll } from "vitest";

// local dependencies
import { setBackendReady } from "@/api/backendReady";
import { createMockServer } from "@/test/mockServer";
import { renderWithRouter } from "@/test/renderWithRouter";

const { server } = createMockServer();

beforeAll(() => server.listen({ onUnhandledFrame: "error" }));
afterAll(() => server.close());
afterEach(() => {
    server.resetHandlers();
    setBackendReady(Promise.resolve());
});

describe("Welcome page", () => {
    it('shows h1 "Warehouse Manager" and four try-card links to /receiving, /catalog, /movements and /dashboard', async () => {
        await renderWithRouter("/");

        expect(
            await screen.findByRole("heading", {
                level: 1,
                name: "Warehouse Manager",
            }),
        ).toBeInTheDocument();

        expect(
            screen.getByRole("link", { name: /receive goods/i }),
        ).toHaveAttribute("href", "/receiving");
        expect(
            screen.getByRole("link", { name: /organize the catalog/i }),
        ).toHaveAttribute("href", "/catalog");
        expect(
            screen.getByRole("link", { name: /trace movements/i }),
        ).toHaveAttribute("href", "/movements");
        expect(
            screen.getByRole("link", { name: /check the dashboard/i }),
        ).toHaveAttribute("href", "/dashboard");
    });

    it('"Source on GitHub" has target=_blank and rel containing noreferrer', async () => {
        await renderWithRouter("/");

        const link = await screen.findByRole("link", {
            name: /source on github/i,
        });
        expect(link).toHaveAttribute("target", "_blank");
        expect(link.getAttribute("rel")).toContain("noreferrer");
    });

    it("nav active state: Welcome is active on /; after navigating to /dashboard Dashboard is active and Welcome is not", async () => {
        const user = userEvent.setup();
        await renderWithRouter("/");

        expect(screen.getByRole("link", { name: /welcome/i })).toHaveAttribute(
            "aria-current",
            "page",
        );

        await user.click(
            screen.getByRole("link", { name: /check the dashboard/i }),
        );
        await screen.findByRole("heading", { level: 1, name: "Dashboard" });

        await waitFor(() => {
            expect(
                screen.getByRole("link", { name: /welcome/i }),
            ).not.toHaveAttribute("aria-current", "page");
            expect(
                screen.getByRole("link", { name: /dashboard/i }),
            ).toHaveAttribute("aria-current", "page");
        });
    });
});
