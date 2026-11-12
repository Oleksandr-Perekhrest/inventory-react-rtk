// outsource dependencies
import userEvent from "@testing-library/user-event";
import { screen, within, waitFor } from "@testing-library/react";
import { it, expect, afterAll, describe, afterEach, beforeAll } from "vitest";

// local dependencies
import { makeStore } from "@/store/store";
import { setBackendReady } from "@/api/backendReady";
import { createEmptyLine } from "@/domain/receiving";
import { createMockServer } from "@/test/mockServer";
import { createMemoryStorage } from "@/mocks/db/storage";
import { renderWithRouter } from "@/test/renderWithRouter";
import {
    saveDraft,
    DRAFT_STORAGE_KEY,
} from "@/features/receiving/draftStorage";

const DRAFT: Parameters<typeof saveDraft>[1] = {
    step: "lines",
    document: {
        supplierId: "sup-001",
        invoiceNumber: "INV-RESTORED",
        date: "2026-01-15",
    },
    lines: [createEmptyLine("restored-line-1")],
};

const { server } = createMockServer();

beforeAll(() => {
    Element.prototype.scrollIntoView = () => {};
    server.listen({ onUnhandledFrame: "error" });
});
afterAll(() => server.close());
afterEach(() => {
    server.resetHandlers();
    setBackendReady(Promise.resolve());
});

describe("Restore draft (T7)", () => {
    it("7 — wizard opens at Lines when storage has a draft; Back shows document values", async () => {
        const user = userEvent.setup();
        const storage = createMemoryStorage();
        saveDraft(storage, DRAFT);

        await renderWithRouter("/receiving", {
            store: makeStore({ storage }),
        });

        // Lines step is immediately active
        const stepList = await screen.findByRole("list", {
            name: "Wizard steps",
        });
        const stepItems = within(stepList).getAllByRole("listitem");
        expect(stepItems[1]).toHaveAttribute("aria-current", "step");
        expect(
            screen.getByRole("button", { name: "Continue" }),
        ).toBeInTheDocument();

        // Back → Document step shows the restored supplier and invoice number
        await user.click(screen.getByRole("button", { name: "Back" }));

        await waitFor(() =>
            expect(screen.getByLabelText("Invoice number")).toHaveValue(
                "INV-RESTORED",
            ),
        );
        // Supplier trigger shows the supplier name once the query resolves
        await waitFor(() =>
            expect(screen.getByLabelText("Supplier")).toHaveTextContent(
                "Greenfield Foods Ltd",
            ),
        );
    });
});

describe("Discard restored draft (T8)", () => {
    it("8 — Discard draft confirms, clears form to Document step, removes storage key, and focuses the page heading; Catalog nav has no dialog", async () => {
        const user = userEvent.setup();
        const storage = createMemoryStorage();
        saveDraft(storage, DRAFT);

        await renderWithRouter("/receiving", {
            store: makeStore({ storage }),
        });

        // Lines step loaded from draft
        await screen.findByRole("button", { name: "Continue" });

        // Open discard dialog
        await user.click(screen.getByRole("button", { name: "Discard draft" }));
        const dialog = await screen.findByRole("alertdialog");
        expect(dialog).toBeVisible();

        // Confirm discard
        await user.click(
            within(dialog).getByRole("button", { name: "Discard" }),
        );

        // Dialog closes
        await waitFor(() =>
            expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument(),
        );

        // Form is reset: Document step, empty invoice
        await waitFor(() =>
            expect(
                screen.queryByRole("button", { name: "Continue" }),
            ).not.toBeInTheDocument(),
        );
        expect(screen.getByLabelText("Invoice number")).toHaveValue("");

        // Storage key is removed
        expect(storage.getItem(DRAFT_STORAGE_KEY)).toBeNull();

        // Focus is on the page heading
        await waitFor(() =>
            expect(
                screen.getByRole("heading", { name: "Receiving" }),
            ).toHaveFocus(),
        );

        // Navigating to Catalog does not trigger the blocker dialog
        await user.click(screen.getByRole("link", { name: "Catalog" }));
        await screen.findByRole("heading", { name: "Catalog" });
        expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument();
    });
});

describe("Route blocker (T9)", () => {
    it("9a — no form changes: clicking Catalog navigates immediately with no dialog and no draft written to storage", async () => {
        const storage = createMemoryStorage();
        const user = userEvent.setup();

        await renderWithRouter("/receiving", {
            store: makeStore({ storage }),
        });

        // Wait for the page to settle (Document step rendered)
        await screen.findByRole("button", { name: "Next" });

        await user.click(screen.getByRole("link", { name: "Catalog" }));

        // No blocker dialog
        await screen.findByRole("heading", { name: "Catalog" });
        expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument();

        // Nothing written to storage
        expect(storage.getItem(DRAFT_STORAGE_KEY)).toBeNull();
    });

    it("9b — typing an invoice number and immediately clicking Catalog shows the Unfinished receipt dialog (flush before block decision)", async () => {
        const storage = createMemoryStorage();
        const user = userEvent.setup();

        await renderWithRouter("/receiving", {
            store: makeStore({ storage }),
        });

        // Wait for Next button to be enabled (suppliers query resolved)
        await waitFor(() =>
            expect(
                screen.getByRole("button", { name: "Next" }),
            ).not.toBeDisabled(),
        );

        // Type invoice number, then immediately click Catalog before 300 ms debounce fires
        await user.type(screen.getByLabelText("Invoice number"), "INV-BLOCKER");
        await user.click(screen.getByRole("link", { name: "Catalog" }));

        // Blocker dialog appears (flush() committed the draft before shouldBlockFn returned)
        await screen.findByRole("alertdialog");
        await screen.findByText("Unfinished receipt");

        // Stay on the page
        await user.click(screen.getByRole("button", { name: "Stay" }));
        await waitFor(() =>
            expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument(),
        );
        expect(
            screen.getByRole("heading", { name: "Receiving" }),
        ).toBeInTheDocument();
        // Invoice value is still there
        expect(screen.getByLabelText("Invoice number")).toHaveValue(
            "INV-BLOCKER",
        );
    });

    it("9c — Keep draft and leave: navigates to Catalog and storage still contains the draft", async () => {
        const storage = createMemoryStorage();
        const user = userEvent.setup();

        await renderWithRouter("/receiving", {
            store: makeStore({ storage }),
        });

        await waitFor(() =>
            expect(
                screen.getByRole("button", { name: "Next" }),
            ).not.toBeDisabled(),
        );

        await user.type(screen.getByLabelText("Invoice number"), "INV-KEEP");
        await user.click(screen.getByRole("link", { name: "Catalog" }));

        await screen.findByRole("alertdialog");

        await user.click(
            screen.getByRole("button", { name: "Keep draft and leave" }),
        );

        await screen.findByRole("heading", { name: "Catalog" });
        expect(storage.getItem(DRAFT_STORAGE_KEY)).not.toBeNull();
    });

    it("9d — Discard and leave: navigates to Catalog and storage key is removed", async () => {
        const storage = createMemoryStorage();
        const user = userEvent.setup();

        await renderWithRouter("/receiving", {
            store: makeStore({ storage }),
        });

        await waitFor(() =>
            expect(
                screen.getByRole("button", { name: "Next" }),
            ).not.toBeDisabled(),
        );

        await user.type(screen.getByLabelText("Invoice number"), "INV-DISCARD");
        await user.click(screen.getByRole("link", { name: "Catalog" }));

        await screen.findByRole("alertdialog");

        await user.click(
            screen.getByRole("button", { name: "Discard and leave" }),
        );

        await screen.findByRole("heading", { name: "Catalog" });
        expect(storage.getItem(DRAFT_STORAGE_KEY)).toBeNull();
    });
});
