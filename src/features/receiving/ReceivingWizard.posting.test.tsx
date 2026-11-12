// outsource dependencies
import { http, HttpResponse } from "msw";
import userEvent from "@testing-library/user-event";
import { screen, within, waitFor } from "@testing-library/react";
import { it, expect, afterAll, describe, afterEach, beforeAll } from "vitest";

// local dependencies
import { makeStore } from "@/store/store";
import { setBackendReady } from "@/api/backendReady";
import { createMockServer } from "@/test/mockServer";
import { createMemoryStorage } from "@/mocks/db/storage";
import { renderWithRouter } from "@/test/renderWithRouter";
import {
    saveDraft,
    DRAFT_STORAGE_KEY,
} from "@/features/receiving/draftStorage";

// prd-0067: "Orange Juice 1 L" — pcs, non-perishable, quantity: 280
// prd-0021: "Unsalted Butter"  — kg, perishable,      quantity: 220.0
// sup-001:  "Greenfield Foods Ltd"
const OJ_ID = "prd-0067";
const BUTTER_ID = "prd-0021";
const SUPPLIER_ID = "sup-001";
const DOCUMENT_DATE = "2026-01-15";

function makeDraft(invoiceNumber: string): Parameters<typeof saveDraft>[1] {
    return {
        step: "review",
        document: {
            supplierId: SUPPLIER_ID,
            invoiceNumber,
            date: DOCUMENT_DATE,
        },
        lines: [
            {
                id: "line-oj-1",
                productId: OJ_ID,
                expectedQuantity: 10,
                actualQuantity: 12,
                discrepancyNote: "Supplier sent 12 instead of 10",
                batch: "",
                expiryDate: "",
            },
            {
                id: "line-ub-1",
                productId: BUTTER_ID,
                expectedQuantity: 5,
                actualQuantity: 5,
                batch: "BATCH-UB-001",
                expiryDate: "2026-01-16",
            },
        ],
    };
}

const { db, server } = createMockServer();

beforeAll(() => {
    Element.prototype.scrollIntoView = () => {};
    server.listen({ onUnhandledFrame: "error" });
});
afterAll(() => server.close());
afterEach(() => {
    server.resetHandlers();
    setBackendReady(Promise.resolve());
});

describe("Success (T-P1)", () => {
    it("P1 — clicking 'Post receipt' shows 'Receipt posted' view, removes draft, adds movements, navigates to catalog without blocker", async () => {
        const user = userEvent.setup();
        const storage = createMemoryStorage();
        saveDraft(storage, makeDraft("INV-POST-S001"));

        const ojBefore = db.products.find((p) => p.id === OJ_ID)?.quantity ?? 0;
        const ubBefore =
            db.products.find((p) => p.id === BUTTER_ID)?.quantity ?? 0;
        const movsCountBefore = db.movements.length;

        await renderWithRouter("/receiving", { store: makeStore({ storage }) });

        // Confirm wizard opened on the review step
        const stepList = await screen.findByRole("list", {
            name: "Wizard steps",
        });
        const stepItems = within(stepList).getAllByRole("listitem");
        expect(stepItems[3]).toHaveAttribute("aria-current", "step");

        await user.click(screen.getByRole("button", { name: "Post receipt" }));

        // "Receipt posted" h2 focuses
        const heading = await screen.findByRole("heading", {
            name: "Receipt posted",
        });
        await waitFor(() => expect(heading).toHaveFocus());

        // Invoice number is shown
        expect(screen.getByText("INV-POST-S001")).toBeInTheDocument();

        // Lines summary
        expect(screen.getByText(/2 lines/)).toHaveTextContent(
            "1 with discrepancy",
        );

        // Draft key removed from storage
        expect(storage.getItem(DRAFT_STORAGE_KEY)).toBeNull();

        // DB has exactly 2 new movements for this receipt
        const newMovs = db.movements.filter(
            (m) =>
                m.reference === "INV-POST-S001" && m.supplierId === SUPPLIER_ID,
        );
        expect(newMovs).toHaveLength(2);
        expect(db.movements).toHaveLength(movsCountBefore + 2);

        // Product quantities grew by the actual amounts received
        const ojAfter = db.products.find((p) => p.id === OJ_ID)?.quantity ?? 0;
        const ubAfter =
            db.products.find((p) => p.id === BUTTER_ID)?.quantity ?? 0;
        expect(ojAfter).toBe(ojBefore + 12); // actual was 12
        expect(ubAfter).toBe(ubBefore + 5); // actual was 5

        // "Go to catalog" navigates without the "Unfinished receipt" dialog
        await user.click(screen.getByRole("link", { name: "Go to catalog" }));
        await screen.findByRole("heading", { name: "Catalog" });
        expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument();
    });
});

describe("409 Duplicate invoice (T-P2)", () => {
    it("P2 — posting a duplicate invoice returns to Document step, shows error on invoice field with focus, typing clears error; db has no new movements", async () => {
        // Pre-seed a receipt movement with the same supplier + invoice
        db.transaction((state) => {
            state.movements.push({
                id: "mov-dup-pre-001",
                type: "receipt",
                productId: OJ_ID,
                quantity: 10,
                date: "2026-01-15T07:00:00.000Z",
                reference: "INV-POST-D001",
                supplierId: SUPPLIER_ID,
                expectedQuantity: 10,
            });
        });

        const movsWithInvoiceBefore = db.movements.filter(
            (m) =>
                m.reference === "INV-POST-D001" && m.supplierId === SUPPLIER_ID,
        ).length;
        // Positive control: the pre-seeded movement is in the db
        expect(movsWithInvoiceBefore).toBe(1);

        const user = userEvent.setup();
        const storage = createMemoryStorage();
        saveDraft(storage, makeDraft("INV-POST-D001"));

        await renderWithRouter("/receiving", { store: makeStore({ storage }) });

        // Confirm we start on the review step
        const stepList = await screen.findByRole("list", {
            name: "Wizard steps",
        });
        const stepItems = within(stepList).getAllByRole("listitem");
        expect(stepItems[3]).toHaveAttribute("aria-current", "step");

        await user.click(screen.getByRole("button", { name: "Post receipt" }));

        // Document step becomes current
        await waitFor(() =>
            expect(stepItems[0]).toHaveAttribute("aria-current", "step"),
        );

        // Invoice field appears with the duplicate error
        const invoiceInput = await screen.findByLabelText("Invoice number");
        await waitFor(() =>
            expect(
                screen.getByText(/has already been received/),
            ).toBeInTheDocument(),
        );

        // Invoice input has focus
        await waitFor(() => expect(invoiceInput).toHaveFocus());

        // Control: db has no new movements from this POST attempt
        const movsWithInvoiceAfter = db.movements.filter(
            (m) =>
                m.reference === "INV-POST-D001" && m.supplierId === SUPPLIER_ID,
        ).length;
        expect(movsWithInvoiceAfter).toBe(1);

        // Typing in the invoice field clears the server error
        await user.type(invoiceInput, "X");
        await waitFor(() =>
            expect(
                screen.queryByText(/has already been received/),
            ).not.toBeInTheDocument(),
        );
    });
});

describe("409 Duplicate invoice via click-through flow (T-P2b)", () => {
    it("P2b — same 409 handling when DocumentStep was rendered in this session (Back then Next through all steps)", async () => {
        // Pre-seed the same invoice so the POST returns 409
        db.transaction((state) => {
            state.movements.push({
                id: "mov-dup-pre-002",
                type: "receipt",
                productId: OJ_ID,
                quantity: 10,
                date: "2026-01-15T07:00:00.000Z",
                reference: "INV-POST-D002",
                supplierId: SUPPLIER_ID,
                expectedQuantity: 10,
            });
        });

        const user = userEvent.setup();
        const storage = createMemoryStorage();
        // No discrepancies so reconciliation validates without notes
        saveDraft(storage, {
            step: "review",
            document: {
                supplierId: SUPPLIER_ID,
                invoiceNumber: "INV-POST-D002",
                date: DOCUMENT_DATE,
            },
            lines: [
                {
                    id: "line-oj-2",
                    productId: OJ_ID,
                    expectedQuantity: 10,
                    batch: "",
                    expiryDate: "",
                },
                {
                    id: "line-ub-2",
                    productId: BUTTER_ID,
                    expectedQuantity: 5,
                    batch: "BATCH-UB-002",
                    expiryDate: "2026-01-16",
                },
            ],
        });

        await renderWithRouter("/receiving", { store: makeStore({ storage }) });

        const stepList = await screen.findByRole("list", {
            name: "Wizard steps",
        });
        const stepItems = within(stepList).getAllByRole("listitem");

        // Click Back three times to reach document step — this registers the invoice field
        await user.click(screen.getByRole("button", { name: "Back" })); // review → reconciliation
        await user.click(screen.getByRole("button", { name: "Back" })); // reconciliation → lines
        await user.click(screen.getByRole("button", { name: "Back" })); // lines → document
        await waitFor(() =>
            expect(stepItems[0]).toHaveAttribute("aria-current", "step"),
        );

        // Wait for suppliers so Next from document is not disabled
        await waitFor(() =>
            expect(
                screen.getByRole("button", { name: "Next" }),
            ).not.toBeDisabled(),
        );

        // Click Next three times back to review
        await user.click(screen.getByRole("button", { name: "Next" })); // document → lines
        await waitFor(() =>
            expect(stepItems[1]).toHaveAttribute("aria-current", "step"),
        );
        await user.click(screen.getByRole("button", { name: "Next" })); // lines → reconciliation
        // Wait for product names so reconciliation validation has what it needs
        await screen.findByRole("group", { name: "Orange Juice 1 L" });
        await user.click(screen.getByRole("button", { name: "Next" })); // reconciliation → review
        await waitFor(() =>
            expect(stepItems[3]).toHaveAttribute("aria-current", "step"),
        );

        await user.click(screen.getByRole("button", { name: "Post receipt" }));

        // Document step and error shown — no TypeError thrown
        await waitFor(() =>
            expect(stepItems[0]).toHaveAttribute("aria-current", "step"),
        );
        const invoiceInput = await screen.findByLabelText("Invoice number");
        await waitFor(() =>
            expect(
                screen.getByText(/has already been received/),
            ).toBeInTheDocument(),
        );
        await waitFor(() => expect(invoiceInput).toHaveFocus());
    });
});

describe("Server error then retry (T-P3)", () => {
    it("P3 — first POST returns 500 showing role='alert'; button re-enables; second click succeeds", async () => {
        server.use(
            http.post(
                "/api/receipts",
                () =>
                    HttpResponse.json(
                        {
                            error: {
                                code: "INTERNAL_ERROR",
                                message: "Server error. Try again.",
                            },
                        },
                        { status: 500 },
                    ),
                { once: true },
            ),
        );

        const user = userEvent.setup();
        const storage = createMemoryStorage();
        saveDraft(storage, makeDraft("INV-POST-R001"));

        await renderWithRouter("/receiving", { store: makeStore({ storage }) });

        // Confirm review step
        const stepList = await screen.findByRole("list", {
            name: "Wizard steps",
        });
        const stepItems = within(stepList).getAllByRole("listitem");
        expect(stepItems[3]).toHaveAttribute("aria-current", "step");

        await user.click(screen.getByRole("button", { name: "Post receipt" }));

        // Error alert appears
        const alert = await screen.findByRole("alert");
        expect(alert).toHaveTextContent("Server error. Try again.");

        // Still on review step
        expect(stepItems[3]).toHaveAttribute("aria-current", "step");

        // "Post receipt" button is enabled again
        expect(
            screen.getByRole("button", { name: "Post receipt" }),
        ).not.toBeDisabled();

        // Click again — one-time error handler is exhausted; real handler succeeds
        await user.click(screen.getByRole("button", { name: "Post receipt" }));

        await screen.findByRole("heading", { name: "Receipt posted" });
        expect(screen.queryByRole("alert")).not.toBeInTheDocument();
    });
});

describe("Reset demo while wizard is open (T-P4)", () => {
    it("P4 — resetting demo data remounts wizard to empty Document step, clears draft key, focuses h1", async () => {
        const user = userEvent.setup();
        const storage = createMemoryStorage();
        saveDraft(storage, makeDraft("INV-POST-N001"));

        await renderWithRouter("/receiving", { store: makeStore({ storage }) });

        // Confirm review step
        await screen.findByRole("list", { name: "Wizard steps" });
        const postButton = await screen.findByRole("button", {
            name: "Post receipt",
        });
        expect(postButton).toBeInTheDocument();

        // Open "Reset demo data" dialog from the sidebar
        const resetButtons = screen.getAllByRole("button", {
            name: "Reset demo data",
        });
        await user.click(resetButtons[0]);

        const dialog = await screen.findByRole("alertdialog");
        await user.click(within(dialog).getByRole("button", { name: "Reset" }));

        // Dialog closes
        await waitFor(() =>
            expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument(),
        );

        // Wizard remounts to the empty Document step
        await waitFor(() => {
            const list = screen.getByRole("list", { name: "Wizard steps" });
            const items = within(list).getAllByRole("listitem");
            expect(items[0]).toHaveAttribute("aria-current", "step");
        });
        expect(screen.getByLabelText("Invoice number")).toHaveValue("");

        // Draft key is gone from storage
        expect(storage.getItem(DRAFT_STORAGE_KEY)).toBeNull();

        // Page h1 has focus
        await waitFor(() =>
            expect(
                screen.getByRole("heading", { name: "Receiving" }),
            ).toHaveFocus(),
        );
    });
});
