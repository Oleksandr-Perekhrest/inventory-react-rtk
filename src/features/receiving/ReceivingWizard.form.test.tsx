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

// Seed constants used in assertions
const PERISHABLE_PRODUCT = "Whole Milk 3.5%"; // unit: "l" → formatUnit → "L"
const EXPIRY_DATE = "2099-12-31";

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

async function goToLinesStep(user: ReturnType<typeof userEvent.setup>) {
    // Wait for Next button to be enabled (suppliers query resolves)
    await waitFor(() =>
        expect(screen.getByRole("button", { name: "Next" })).not.toBeDisabled(),
    );
    // Radix Select portal does not mount in jsdom — use the hidden native <select>
    const supplierLabel = screen.getByText("Supplier", { selector: "label" });
    const hiddenSelect = supplierLabel.parentElement?.querySelector("select");
    expect(hiddenSelect).toBeTruthy();
    if (hiddenSelect) {
        await user.selectOptions(hiddenSelect, "sup-001");
    }
    await user.type(screen.getByLabelText("Invoice number"), "INV-TEST-001");
    await user.click(screen.getByRole("button", { name: "Next" }));
    await screen.findByRole("button", { name: "Continue" });
}

describe("Document step validation (T1)", () => {
    it("1 — Next on empty form shows field errors, focus moves to supplier trigger, typing invoice removes that error", async () => {
        const user = userEvent.setup();
        await renderWithRouter("/receiving", {
            store: makeStore({ storage: createMemoryStorage() }),
        });

        // Wait for Next button to be enabled (suppliers loaded)
        await waitFor(() =>
            expect(
                screen.getByRole("button", { name: "Next" }),
            ).not.toBeDisabled(),
        );
        await user.click(screen.getByRole("button", { name: "Next" }));

        // Error messages appear under their fields
        await screen.findByText("Select a supplier", { selector: "p" });
        await screen.findByText("Enter an invoice number", { selector: "p" });

        const supplierTrigger = screen.getByLabelText("Supplier");
        const invoiceInput = screen.getByLabelText("Invoice number");

        // aria-invalid is set on both controls
        expect(supplierTrigger).toHaveAttribute("aria-invalid", "true");
        expect(invoiceInput).toHaveAttribute("aria-invalid", "true");

        // aria-describedby links each control to its error message
        expect(supplierTrigger).toHaveAccessibleDescription(
            "Select a supplier",
        );
        expect(invoiceInput).toHaveAccessibleDescription(
            "Enter an invoice number",
        );

        // Focus moves to the supplier trigger (first invalid element)
        await waitFor(() => expect(supplierTrigger).toHaveFocus());

        // Typing an invoice number clears that error without clicking Next again
        await user.type(invoiceInput, "INV-001");
        await waitFor(() =>
            expect(
                screen.queryByText("Enter an invoice number"),
            ).not.toBeInTheDocument(),
        );
    });
});

describe("Per-step gate regression (T2)", () => {
    it("2 — filling document step and clicking Next shows the Lines step; typing in quantity shows no errors before Continue is clicked", async () => {
        const user = userEvent.setup();
        await renderWithRouter("/receiving", {
            store: makeStore({ storage: createMemoryStorage() }),
        });

        await goToLinesStep(user);

        // Lines step is active (aria-current="step" on the "Lines" listitem)
        const stepList = screen.getByRole("list", { name: "Wizard steps" });
        const stepItems = within(stepList).getAllByRole("listitem");
        expect(stepItems[1]).toHaveAttribute("aria-current", "step");

        // Typing into quantity does not show validation errors before Continue is clicked
        const qtyInput = screen.getByLabelText("Expected quantity");
        await user.type(qtyInput, "10");
        expect(
            screen.queryByText("Enter a quantity greater than 0"),
        ).not.toBeInTheDocument();
    });
});

describe("Product combobox (T3)", () => {
    it("3 — typing shows options after debounce; ArrowDown+Enter selects; unit suffix shows; Escape while typing restores name", async () => {
        const user = userEvent.setup();
        await renderWithRouter("/receiving", {
            store: makeStore({ storage: createMemoryStorage() }),
        });

        await goToLinesStep(user);

        const combobox = screen.getByRole("combobox");

        // Typing a partial name shows options after the 250 ms debounce
        await user.click(combobox);
        await user.type(combobox, "whole milk");
        const option = await screen.findByRole("option", {
            name: /Whole Milk 3\.5%/,
        });
        expect(option).toBeInTheDocument();

        // ArrowDown + Enter selects the product
        await user.keyboard("{ArrowDown}");
        await user.keyboard("{Enter}");

        // Input displays the selected product name
        expect(combobox).toHaveValue(PERISHABLE_PRODUCT);

        // Quantity suffix shows the product's unit ("l" → "L")
        await screen.findByText("L");

        // Escape while typing in an open combobox restores the previously selected name
        await user.type(combobox, "xyz");
        expect(combobox).toHaveValue(`${PERISHABLE_PRODUCT}xyz`);
        await user.keyboard("{Escape}");
        expect(combobox).toHaveValue(PERISHABLE_PRODUCT);
    });
});

describe("Perishable switch regression (T4)", () => {
    it("4 — selecting perishable shows Batch+Expiry; switching to non-perishable hides them; switching back shows them empty", async () => {
        const user = userEvent.setup();
        await renderWithRouter("/receiving", {
            store: makeStore({ storage: createMemoryStorage() }),
        });

        await goToLinesStep(user);

        const combobox = screen.getByRole("combobox");

        // Select perishable product — Batch and Expiry date fields appear
        await user.click(combobox);
        await user.type(combobox, "whole milk");
        await user.click(
            await screen.findByRole("option", { name: /Whole Milk 3\.5%/ }),
        );
        await screen.findByLabelText("Batch");
        expect(screen.getByLabelText("Expiry date")).toBeInTheDocument();

        // Switch to a non-perishable product — Batch and Expiry date disappear
        await user.clear(combobox);
        await user.type(combobox, "orange juice");
        await user.click(
            await screen.findByRole("option", { name: /Orange Juice 1 L/ }),
        );
        await waitFor(() =>
            expect(screen.queryByLabelText("Batch")).not.toBeInTheDocument(),
        );
        expect(screen.queryByLabelText("Expiry date")).not.toBeInTheDocument();

        // Switch back to the perishable product — Batch and Expiry date reappear, empty
        await user.clear(combobox);
        await user.type(combobox, "whole milk");
        await user.click(
            await screen.findByRole("option", { name: /Whole Milk 3\.5%/ }),
        );
        await screen.findByLabelText("Batch");
        expect(screen.getByLabelText("Batch")).toHaveValue("");
        expect(screen.getByLabelText("Expiry date")).toHaveValue("");
    });
});

describe("Continue validation (T5)", () => {
    it("5 — perishable row without batch shows error and focuses it; two rows with same batch show duplicate error on second row only; fixing data shows success status", async () => {
        const user = userEvent.setup();
        await renderWithRouter("/receiving", {
            store: makeStore({ storage: createMemoryStorage() }),
        });

        await goToLinesStep(user);

        const combobox = screen.getByRole("combobox");

        // Fill row 1: perishable product + quantity, leave batch empty
        await user.click(combobox);
        await user.type(combobox, "whole milk");
        await user.click(
            await screen.findByRole("option", { name: /Whole Milk 3\.5%/ }),
        );
        await screen.findByLabelText("Batch");
        await user.type(screen.getByLabelText("Expected quantity"), "5");

        // Click Continue with empty batch → batch error appears
        await user.click(screen.getByRole("button", { name: "Continue" }));
        await screen.findByText("Enter a batch number");

        const batchInput = screen.getByLabelText("Batch");
        expect(batchInput).toHaveAttribute("aria-invalid", "true");
        await waitFor(() => expect(batchInput).toHaveFocus());

        // Fill batch and expiry for row 1 to make it valid
        await user.type(batchInput, "BATCH-X");
        await user.type(screen.getByLabelText("Expiry date"), EXPIRY_DATE);

        // Add a second row with the same product and same batch
        await user.click(screen.getByRole("button", { name: "Add line" }));
        await waitFor(() =>
            expect(screen.getAllByRole("combobox")).toHaveLength(2),
        );

        const comboboxes = screen.getAllByRole("combobox");
        await user.click(comboboxes[1]);
        await user.type(comboboxes[1], "whole milk");
        await user.click(
            await screen.findByRole("option", { name: /Whole Milk 3\.5%/ }),
        );

        const batchInputs = await screen.findAllByLabelText("Batch");
        await user.type(screen.getAllByLabelText("Expected quantity")[1], "3");
        await user.type(batchInputs[1], "BATCH-X");
        await user.type(
            screen.getAllByLabelText("Expiry date")[1],
            EXPIRY_DATE,
        );

        // Continue with duplicate batch → error on second row's Product field
        await user.click(screen.getByRole("button", { name: "Continue" }));
        await screen.findByText("Duplicate product and batch combination");
        // Only the second row has the error — first row's product combobox is clean
        expect(screen.getAllByRole("combobox")[0]).not.toHaveAttribute(
            "aria-invalid",
            "true",
        );
        expect(screen.getAllByRole("combobox")[1]).toHaveAttribute(
            "aria-invalid",
            "true",
        );

        // Fix: change second row's batch to something unique
        const updatedBatchInputs = screen.getAllByLabelText("Batch");
        await user.clear(updatedBatchInputs[1]);
        await user.type(updatedBatchInputs[1], "BATCH-Y");

        // Continue → success status message
        await user.click(screen.getByRole("button", { name: "Continue" }));
        await screen.findByText(
            "Lines are complete — reconciliation comes in the next stage.",
        );
    });
});

describe("Add/remove focus (T6)", () => {
    it("6 — Add line focuses new product input; removing middle focuses successor; removing last focuses Add line; remove button disabled with one row", async () => {
        const user = userEvent.setup();
        await renderWithRouter("/receiving", {
            store: makeStore({ storage: createMemoryStorage() }),
        });

        await goToLinesStep(user);

        // With one row, the remove button is disabled
        expect(
            screen.getByRole("button", { name: "Remove line 1" }),
        ).toBeDisabled();

        const addLine = screen.getByRole("button", { name: "Add line" });

        // Add a second row — focus moves to new row's product combobox
        await user.click(addLine);
        await waitFor(() =>
            expect(screen.getAllByRole("combobox")).toHaveLength(2),
        );
        await waitFor(() =>
            expect(screen.getAllByRole("combobox")[1]).toHaveFocus(),
        );

        // Add a third row — focus moves to that row's product combobox
        await user.click(addLine);
        await waitFor(() =>
            expect(screen.getAllByRole("combobox")).toHaveLength(3),
        );
        await waitFor(() =>
            expect(screen.getAllByRole("combobox")[2]).toHaveFocus(),
        );

        // Remove middle row (row 2) → the row that took its place (was row 3, now row 2) gets focus
        await user.click(screen.getByRole("button", { name: "Remove line 2" }));
        await waitFor(() =>
            expect(screen.getAllByRole("combobox")).toHaveLength(2),
        );
        await waitFor(() =>
            expect(screen.getAllByRole("combobox")[1]).toHaveFocus(),
        );

        // Remove last row (row 2 of the remaining two) → focus moves to Add line button
        await user.click(screen.getByRole("button", { name: "Remove line 2" }));
        await waitFor(() =>
            expect(screen.getAllByRole("combobox")).toHaveLength(1),
        );
        await waitFor(() =>
            expect(
                screen.getByRole("button", { name: "Add line" }),
            ).toHaveFocus(),
        );

        // Back to one row: remove button is disabled again
        expect(
            screen.getByRole("button", { name: "Remove line 1" }),
        ).toBeDisabled();
    });
});
