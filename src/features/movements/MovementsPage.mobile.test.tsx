// outsource dependencies
import userEvent from "@testing-library/user-event";
import { screen, within, waitFor } from "@testing-library/react";
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
import { setBackendReady } from "@/api/backendReady";
import { createMockServer } from "@/test/mockServer";
import { renderWithRouter } from "@/test/renderWithRouter";

const { db, server } = createMockServer();

type M = (typeof db.movements)[number];

function localIsoDate(d: Date): string {
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

beforeAll(() => server.listen({ onUnhandledFrame: "error" }));
afterAll(() => server.close());
afterEach(() => {
    server.resetHandlers();
    setBackendReady(Promise.resolve());
});

describe("MovementsPage – mobile layout", () => {
    describe("375 px mobile viewport", () => {
        const originalInnerWidth = window.innerWidth;

        beforeEach(() => {
            Object.defineProperty(window, "innerWidth", {
                writable: true,
                configurable: true,
                value: 375,
            });
        });

        afterEach(() => {
            Object.defineProperty(window, "innerWidth", {
                writable: true,
                configurable: true,
                value: originalInnerWidth,
            });
        });

        it("1 — no inline filters, 'Filters' button, no 'Clear filters'", async () => {
            await renderWithRouter("/movements");
            expect(screen.queryByText("From")).not.toBeInTheDocument();
            screen.getByRole("button", { name: "Filters" });
            expect(
                screen.queryByRole("button", { name: "Clear filters" }),
            ).not.toBeInTheDocument();
        });

        it("2 — opening sheet: dialog 'Filters' appears; active element is inside dialog and is not an input", async () => {
            const user = userEvent.setup();
            await renderWithRouter("/movements");

            await user.click(screen.getByRole("button", { name: "Filters" }));

            const dialog = await screen.findByRole("dialog", {
                name: "Filters",
            });

            await waitFor(() => {
                expect(document.activeElement).not.toBeNull();
                expect(dialog.contains(document.activeElement)).toBe(true);
                expect(document.activeElement?.tagName.toLowerCase()).not.toBe(
                    "input",
                );
            });
        });

        describe("Preset via mobile Sheet", () => {
            afterEach(() => {
                vi.useRealTimers();
            });

            it("3 — Last 7 days sets bottom button count, clicking it closes dialog and focuses trigger 'Filters, 1 active'", async () => {
                const user = userEvent.setup();

                const expectedFrom = "2026-10-31";
                const expectedTo = "2026-11-06";

                const rangeCount = db.movements.filter((m: M) => {
                    const d = localIsoDate(new Date(m.date));
                    return d >= expectedFrom && d <= expectedTo;
                }).length;
                expect(rangeCount).toBeGreaterThan(0);

                vi.useFakeTimers({ toFake: ["Date"] });
                vi.setSystemTime(new Date(2026, 10, 6, 18, 0));

                await renderWithRouter("/movements");

                await user.click(
                    screen.getByRole("button", { name: "Filters" }),
                );

                const dialog = screen.getByRole("dialog", { name: "Filters" });

                await user.click(
                    within(dialog).getByRole("button", {
                        name: "Last 7 days",
                    }),
                );

                const expectedButtonLabel = `Show ${new Intl.NumberFormat("en-US").format(rangeCount)} movement${rangeCount !== 1 ? "s" : ""}`;
                await within(dialog).findByRole("button", {
                    name: expectedButtonLabel,
                });

                await user.click(
                    within(dialog).getByRole("button", {
                        name: expectedButtonLabel,
                    }),
                );

                await waitFor(() => {
                    expect(
                        screen.queryByRole("dialog"),
                    ).not.toBeInTheDocument();
                });

                await waitFor(() => {
                    expect(
                        screen.getByRole("button", {
                            name: "Filters, 1 active",
                        }),
                    ).toHaveFocus();
                });
            });
        });

        it("4 — deep link ?type=receipt: trigger 'Filters, 1 active' and 'Clear filters'; clicking Clear filters removes type and renames trigger", async () => {
            const user = userEvent.setup();
            const { router } = await renderWithRouter(
                "/movements?type=receipt",
            );

            await screen.findByRole("button", { name: "Filters, 1 active" });
            screen.getByRole("button", { name: "Clear filters" });

            await user.click(
                screen.getByRole("button", { name: "Clear filters" }),
            );

            await waitFor(() => {
                expect(router.state.location.searchStr).not.toContain("type=");
            });

            await screen.findByRole("button", { name: "Filters" });
        });
    });

    describe("desktop guard (1024 px default)", () => {
        it("5 — 'From' label is present inline and there is no 'Filters' button", async () => {
            await renderWithRouter("/movements");

            await screen.findByText("From");
            expect(
                screen.queryByRole("button", { name: /^Filters/i }),
            ).not.toBeInTheDocument();
        });
    });
});
