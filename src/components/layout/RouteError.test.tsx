// outsource dependencies
import userEvent from "@testing-library/user-event";
import { screen, waitFor } from "@testing-library/react";
import {
    it,
    vi,
    expect,
    afterAll,
    describe,
    afterEach,
    beforeAll,
    beforeEach,
} from "vitest";

// local dependencies
import { createMockServer } from "@/test/mockServer";
import { renderWithRouter } from "@/test/renderWithRouter";

const { db, server } = createMockServer();

const flags = vi.hoisted(() => ({ shouldThrow: true }));

vi.mock("@/features/dashboard/DashboardPage", () => ({
    DashboardPage: () => {
        if (flags.shouldThrow) {
            throw new Error("Test render failure");
        }
        return <h1>Dashboard OK</h1>;
    },
}));

beforeAll(() => server.listen({ onUnhandledFrame: "error" }));
afterAll(() => server.close());

describe("RouteError", () => {
    let consoleSpy: ReturnType<typeof vi.spyOn>;

    beforeEach(() => {
        flags.shouldThrow = true;
        consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    });

    afterEach(() => {
        consoleSpy.mockRestore();
        server.resetHandlers();
        db.reset();
    });

    it("shows error screen inside layout: h1 focused, sidebar present, error details shown", async () => {
        await renderWithRouter("/dashboard");

        const h1 = await screen.findByRole("heading", {
            name: /something went wrong/i,
        });
        expect(h1).toBeVisible();
        await waitFor(() => expect(document.activeElement).toBe(h1));

        expect(
            screen.getByRole("link", { name: "Catalog" }),
        ).toBeInTheDocument();

        expect(screen.getByText("Test render failure")).toBeInTheDocument();
    });

    it('clicking "Try again" re-renders the route and shows page content', async () => {
        const user = userEvent.setup();
        await renderWithRouter("/dashboard");
        await screen.findByRole("heading", { name: /something went wrong/i });

        flags.shouldThrow = false;
        await user.click(screen.getByRole("button", { name: /try again/i }));

        await screen.findByRole("heading", { name: /dashboard ok/i });
        expect(
            screen.queryByRole("heading", { name: /something went wrong/i }),
        ).not.toBeInTheDocument();
    });

    it('"Go to catalog" navigates to /catalog and shows the catalog heading', async () => {
        const user = userEvent.setup();
        const { router } = await renderWithRouter("/dashboard");
        await screen.findByRole("heading", { name: /something went wrong/i });

        await user.click(screen.getByRole("link", { name: /go to catalog/i }));

        await screen.findByRole("heading", { name: "Catalog" });
        expect(router.state.location.pathname).toBe("/catalog");
    });
});
