// outsource dependencies
import userEvent from "@testing-library/user-event";
import { screen, waitFor } from "@testing-library/react";
import { http, delay, passthrough, HttpResponse } from "msw";
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
import { setBackendReady } from "@/api/backendReady";
import { createMockServer } from "@/test/mockServer";
import { renderWithRouter } from "@/test/renderWithRouter";
import { getErrorMode, setErrorMode } from "@/mocks/api/network";

const { db, server } = createMockServer();

beforeAll(() => server.listen({ onUnhandledFrame: "error" }));
afterAll(() => server.close());

beforeEach(() => {
    localStorage.clear();
});

afterEach(() => {
    server.resetHandlers();
    db.reset();
    setBackendReady(Promise.resolve());
});

describe("Reset dialog", () => {
    it("opening dialog and confirming sends POST /api/demo/reset and closes it", async () => {
        const user = userEvent.setup();
        await renderWithRouter("/catalog");

        await user.click(
            screen.getAllByRole("button", { name: /reset demo data/i })[0],
        );
        expect(screen.getByRole("alertdialog")).toBeVisible();

        await user.click(screen.getByRole("button", { name: /^reset$/i }));

        await waitFor(() => {
            expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument();
        });
    });

    it("while request is pending, confirm button is disabled", async () => {
        server.use(
            http.post("/api/demo/reset", async () => {
                await delay(5000);
                return new HttpResponse(null, { status: 204 });
            }),
        );

        const user = userEvent.setup();
        await renderWithRouter("/catalog");

        await user.click(
            screen.getAllByRole("button", { name: /reset demo data/i })[0],
        );
        await user.click(screen.getByRole("button", { name: /^reset$/i }));

        await waitFor(() => {
            expect(
                screen.getByRole("button", { name: /resetting/i }),
            ).toBeDisabled();
        });
    });

    it("when reset returns 500, dialog stays open and role='alert' shows error message", async () => {
        server.use(
            http.post("/api/demo/reset", () =>
                HttpResponse.json(
                    {
                        error: {
                            code: "INTERNAL_ERROR",
                            message: "Server failed",
                        },
                    },
                    { status: 500 },
                ),
            ),
        );

        const user = userEvent.setup();
        await renderWithRouter("/catalog");

        await user.click(
            screen.getAllByRole("button", { name: /reset demo data/i })[0],
        );
        await user.click(screen.getByRole("button", { name: /^reset$/i }));

        await waitFor(() => {
            expect(screen.getByRole("alert")).toBeVisible();
        });
        expect(screen.getByRole("alertdialog")).toBeInTheDocument();
    });

    it("Cancel closes the dialog without sending a request", async () => {
        let resetCallCount = 0;
        server.use(
            http.post("/api/demo/reset", () => {
                resetCallCount++;
                return passthrough();
            }),
        );

        const user = userEvent.setup();
        await renderWithRouter("/catalog");

        await user.click(
            screen.getAllByRole("button", { name: /reset demo data/i })[0],
        );
        expect(screen.getByRole("alertdialog")).toBeVisible();

        await user.click(screen.getByRole("button", { name: /cancel/i }));

        await waitFor(() => {
            expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument();
        });
        expect(resetCallCount).toBe(0);
    });
});

describe("Error switch", () => {
    it("initial state is checked when 'random' is stored in localStorage", async () => {
        setErrorMode("random");
        await renderWithRouter("/catalog");
        expect(
            screen.getByRole("switch", { name: /simulate network errors/i }),
        ).toBeChecked();
    });

    it("control: initial state is unchecked when nothing is stored", async () => {
        await renderWithRouter("/catalog");
        expect(
            screen.getByRole("switch", { name: /simulate network errors/i }),
        ).not.toBeChecked();
    });

    it("clicking the label toggles the switch and persists the mode", async () => {
        const user = userEvent.setup();
        await renderWithRouter("/catalog");

        // Two elements carry this text: the <label> (expanded) and the <span>
        // inside the collapsed SidebarMenuButton. We want the <label>.
        const label = screen.getAllByText("Simulate network errors")[0];
        await user.click(label);

        await waitFor(() => {
            expect(
                screen.getByRole("switch", {
                    name: /simulate network errors/i,
                }),
            ).toBeChecked();
        });
        expect(getErrorMode()).toBe("random");

        await user.click(label);

        await waitFor(() => {
            expect(
                screen.getByRole("switch", {
                    name: /simulate network errors/i,
                }),
            ).not.toBeChecked();
        });
        expect(getErrorMode()).toBe("off");
    });
});

describe("Collapsed sidebar error control", () => {
    it("error control is a button whose aria-pressed changes on click", async () => {
        const user = userEvent.setup();
        await renderWithRouter("/catalog");

        await user.click(
            screen.getByRole("button", { name: "Collapse sidebar" }),
        );
        await waitFor(() => {
            expect(
                document.querySelector('[data-slot="sidebar"]'),
            ).toHaveAttribute("data-state", "collapsed");
        });

        const errorBtn = screen.getByRole("button", {
            name: /simulate network errors/i,
        });
        expect(errorBtn).toHaveAttribute("aria-pressed", "false");

        await user.click(errorBtn);

        await waitFor(() => {
            expect(
                screen.getByRole("button", {
                    name: /simulate network errors/i,
                }),
            ).toHaveAttribute("aria-pressed", "true");
        });
    });
});
