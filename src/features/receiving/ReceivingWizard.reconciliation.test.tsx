// outsource dependencies
import userEvent from "@testing-library/user-event";
import { screen, within, waitFor } from "@testing-library/react";
import { it, expect, afterAll, describe, afterEach, beforeAll } from "vitest";

// local dependencies
import { makeStore } from "@/store/store";
import { setBackendReady } from "@/api/backendReady";
import { createMockServer } from "@/test/mockServer";
import { createMemoryStorage } from "@/mocks/db/storage";
import { renderWithRouter } from "@/test/renderWithRouter";
import { saveDraft } from "@/features/receiving/draftStorage";

// prd-0067: "Orange Juice 1 L" — pcs, non-perishable, expectedQuantity=10
// prd-0021: "Unsalted Butter"  — kg, perishable,      expectedQuantity=5.5
const PCS_PRODUCT_NAME = "Orange Juice 1 L";
const KG_PRODUCT_NAME = "Unsalted Butter";

const DRAFT: Parameters<typeof saveDraft>[1] = {
    step: "reconciliation",
    document: {
        supplierId: "sup-001",
        invoiceNumber: "INV-RECON-001",
        date: "2026-01-15",
    },
    lines: [
        {
            id: "line-pcs-1",
            productId: "prd-0067",
            expectedQuantity: 10,
            batch: "",
            expiryDate: "",
        },
        {
            id: "line-kg-1",
            productId: "prd-0021",
            expectedQuantity: 5.5,
            batch: "BATCH-UB",
            expiryDate: "2027-01-01",
        },
    ],
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

async function setup() {
    const user = userEvent.setup();
    const storage = createMemoryStorage();
    saveDraft(storage, DRAFT);
    await renderWithRouter("/receiving", {
        store: makeStore({ storage }),
    });
    const pcsRow = await screen.findByRole("group", { name: PCS_PRODUCT_NAME });
    const kgRow = await screen.findByRole("group", { name: KG_PRODUCT_NAME });
    return { user, pcsRow, kgRow };
}

describe("Prefill (T-R1)", () => {
    it("R1 — reconciliation rows prefill from expected quantities; summary shows 0 discrepancies; no Discrepancy note field", async () => {
        const { pcsRow, kgRow } = await setup();

        // Each row is a named group
        expect(pcsRow).toBeInTheDocument();
        expect(kgRow).toBeInTheDocument();

        // "Actual quantity" shows the expected quantity (actualQuantity is unset → defaults to expectedQuantity)
        expect(within(pcsRow).getByLabelText("Actual quantity")).toHaveValue(
            10,
        );
        expect(within(kgRow).getByLabelText("Actual quantity")).toHaveValue(
            5.5,
        );

        // Summary: 2 lines, 0 discrepancies
        expect(screen.getByText(/2 lines/)).toHaveTextContent(
            "0 with discrepancies",
        );

        // No Discrepancy note field anywhere (control: Actual quantity fields are present)
        expect(
            screen.queryByLabelText("Discrepancy note"),
        ).not.toBeInTheDocument();
        expect(
            within(pcsRow).getByLabelText("Actual quantity"),
        ).toBeInTheDocument();
    });
});

describe("Discrepancy (T-R2)", () => {
    it("R2 — changing pcs actual triggers markers; Next without note errors on note with focus; typing note and Next goes to review; resetting value removes markers", async () => {
        const { user, pcsRow, kgRow } = await setup();

        const pcsInput = within(pcsRow).getByLabelText("Actual quantity");

        // Change pcs actual to 12 (expected: 10)
        await user.clear(pcsInput);
        await user.type(pcsInput, "12");

        // Row has data-discrepancy="true"
        await waitFor(() =>
            expect(pcsRow).toHaveAttribute("data-discrepancy", "true"),
        );

        // Signed difference "+2 pcs" is shown
        expect(within(pcsRow).getByText("+2 pcs")).toBeInTheDocument();

        // "Discrepancy note" appears in pcs row only (not in kg row)
        await waitFor(() =>
            expect(
                within(pcsRow).getByLabelText("Discrepancy note"),
            ).toBeInTheDocument(),
        );
        expect(
            within(kgRow).queryByLabelText("Discrepancy note"),
        ).not.toBeInTheDocument();

        // Summary says 1 with discrepancy
        expect(screen.getByText(/2 lines/)).toHaveTextContent(
            "1 with discrepancy",
        );

        // Control: setting value back to expected removes markers and note field
        await user.clear(pcsInput);
        await user.type(pcsInput, "10");
        await waitFor(() =>
            expect(pcsRow).not.toHaveAttribute("data-discrepancy"),
        );
        await waitFor(() =>
            expect(
                within(pcsRow).queryByLabelText("Discrepancy note"),
            ).not.toBeInTheDocument(),
        );

        // Restore discrepancy for the Next/review assertions
        await user.clear(pcsInput);
        await user.type(pcsInput, "12");
        await waitFor(() =>
            expect(pcsRow).toHaveAttribute("data-discrepancy", "true"),
        );

        // Next without a note → error shown; focus is on the note textarea
        await user.click(screen.getByRole("button", { name: "Next" }));
        await screen.findByText("Explain the discrepancy");
        const noteField = within(pcsRow).getByLabelText("Discrepancy note");
        await waitFor(() => expect(noteField).toHaveFocus());

        // Type a note and click Next → review step becomes current
        await user.type(noteField, "Supplier sent 12 instead of 10");
        await user.click(screen.getByRole("button", { name: "Next" }));

        const stepList = screen.getByRole("list", { name: "Wizard steps" });
        const stepItems = within(stepList).getAllByRole("listitem");
        await waitFor(() =>
            expect(stepItems[3]).toHaveAttribute("aria-current", "step"),
        );
    });
});

describe("Cleared input (T-R3)", () => {
    it("R3 — clearing kg actual does not show a note field; summary still shows 0 discrepancies; Next shows Enter the actual quantity in that row", async () => {
        const { user, pcsRow, kgRow } = await setup();

        const kgInput = within(kgRow).getByLabelText("Actual quantity");

        // Clear the kg actual quantity
        await user.clear(kgInput);

        // No note field appears (control: pcs actual quantity input is still present)
        expect(
            within(kgRow).queryByLabelText("Discrepancy note"),
        ).not.toBeInTheDocument();
        expect(
            within(pcsRow).getByLabelText("Actual quantity"),
        ).toBeInTheDocument();

        // Summary does not count cleared row as a discrepancy
        expect(screen.getByText(/2 lines/)).toHaveTextContent(
            "0 with discrepancies",
        );

        // Next → "Enter the actual quantity" error in the kg row
        await user.click(screen.getByRole("button", { name: "Next" }));
        await waitFor(() =>
            expect(
                within(kgRow).getByText("Enter the actual quantity"),
            ).toBeInTheDocument(),
        );
    });
});

describe("Error persistence across steps (T-R5)", () => {
    it("R5 — 'Nothing to receive' alert is visible on reconciliation; after Back it is gone on the lines step", async () => {
        const { user, pcsRow, kgRow } = await setup();

        const pcsInput = within(pcsRow).getByLabelText("Actual quantity");
        const kgInput = within(kgRow).getByLabelText("Actual quantity");

        // Set both actuals to 0 and add notes
        await user.clear(pcsInput);
        await user.type(pcsInput, "0");
        const pcsNote =
            await within(pcsRow).findByLabelText("Discrepancy note");
        await user.type(pcsNote, "Returned to supplier");

        await user.clear(kgInput);
        await user.type(kgInput, "0");
        const kgNote = await within(kgRow).findByLabelText("Discrepancy note");
        await user.type(kgNote, "Damaged on arrival");

        // Next → "Nothing to receive" alert is visible on reconciliation (control)
        await user.click(screen.getByRole("button", { name: "Next" }));
        const alert = await screen.findByRole("alert");
        expect(alert).toHaveTextContent(
            "Nothing to receive: all actual quantities are 0",
        );
        const stepList = screen.getByRole("list", { name: "Wizard steps" });
        const stepItems = within(stepList).getAllByRole("listitem");
        expect(stepItems[2]).toHaveAttribute("aria-current", "step");

        // Click Back → go to lines step; alert must be gone
        await user.click(screen.getByRole("button", { name: "Back" }));
        await waitFor(() =>
            expect(stepItems[1]).toHaveAttribute("aria-current", "step"),
        );
        expect(
            screen.queryByText(
                "Nothing to receive: all actual quantities are 0",
            ),
        ).not.toBeInTheDocument();
    });
});

describe("Nothing to receive (T-R4)", () => {
    it("R4 — all actual quantities 0 with notes triggers alert and step stays; setting one positive and Next advances to review", async () => {
        const { user, pcsRow, kgRow } = await setup();

        const pcsInput = within(pcsRow).getByLabelText("Actual quantity");
        const kgInput = within(kgRow).getByLabelText("Actual quantity");

        // Set pcs actual to 0 (creates discrepancy) then add a note
        await user.clear(pcsInput);
        await user.type(pcsInput, "0");
        const pcsNote =
            await within(pcsRow).findByLabelText("Discrepancy note");
        await user.type(pcsNote, "Returned to supplier");

        // Set kg actual to 0 (creates discrepancy) then add a note
        await user.clear(kgInput);
        await user.type(kgInput, "0");
        const kgNote = await within(kgRow).findByLabelText("Discrepancy note");
        await user.type(kgNote, "Damaged on arrival");

        // Next → role="alert" with the nothing-to-receive message
        await user.click(screen.getByRole("button", { name: "Next" }));
        const alert = await screen.findByRole("alert");
        expect(alert).toHaveTextContent(
            "Nothing to receive: all actual quantities are 0",
        );

        // Step does not change — reconciliation is still active
        const stepList = screen.getByRole("list", { name: "Wizard steps" });
        const stepItems = within(stepList).getAllByRole("listitem");
        expect(stepItems[2]).toHaveAttribute("aria-current", "step");

        // Control: set pcs back to positive → Next moves to review
        await user.clear(pcsInput);
        await user.type(pcsInput, "10");
        await user.click(screen.getByRole("button", { name: "Next" }));
        await waitFor(() =>
            expect(stepItems[3]).toHaveAttribute("aria-current", "step"),
        );
    });
});
