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
import { saveDraft } from "@/features/receiving/draftStorage";

// prd-0067: "Orange Juice 1 L" — pcs, non-perishable
// sup-001:  "Greenfield Foods Ltd"
const OJ_ID = "prd-0067";
const SUPPLIER_ID = "sup-001";
const SUPPLIER_NAME = "Greenfield Foods Ltd";
const DOCUMENT_DATE = "2026-01-15";

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

function makeGate(): { gate: Promise<void>; open: () => void } {
    let resolve: () => void = () => undefined;
    const gate = new Promise<void>((res) => {
        resolve = res;
    });
    return { gate, open: () => resolve() };
}

function installGatedProductHandler(gate: Promise<void>): void {
    server.use(
        http.get("/api/products/:id", async ({ params }) => {
            await gate;
            const product = db.products.find((p) => p.id === params.id);
            if (!product) {
                return HttpResponse.json(
                    {
                        error: {
                            code: "NOT_FOUND",
                            message: "Product not found",
                        },
                    },
                    { status: 404 },
                );
            }
            return HttpResponse.json(product);
        }),
    );
}

async function goToLinesStep(
    user: ReturnType<typeof userEvent.setup>,
    invoiceNumber: string,
) {
    await waitFor(() =>
        expect(screen.getByRole("button", { name: "Next" })).not.toBeDisabled(),
    );
    await user.click(screen.getByLabelText("Supplier"));
    await user.click(
        await screen.findByRole("option", { name: SUPPLIER_NAME }),
    );
    await user.type(screen.getByLabelText("Invoice number"), invoiceNumber);
    await user.click(screen.getByRole("button", { name: "Next" }));
    await screen.findByRole("button", { name: "Add line" });
}

async function selectOjAndFillQty(user: ReturnType<typeof userEvent.setup>) {
    const combobox = screen.getByRole("combobox");
    await user.click(combobox);
    await user.type(combobox, "orange juice");
    await user.click(
        await screen.findByRole("option", { name: /Orange Juice 1 L/ }),
    );
    await user.type(screen.getByLabelText("Expected quantity"), "10");
}

describe("Race condition: Next while product GET is pending (T-R1)", () => {
    it("R1 — Next disabled and no 'Product not found' while GET is pending; gate opens → Reconciliation", async () => {
        const { gate, open } = makeGate();
        installGatedProductHandler(gate);

        const user = userEvent.setup();
        await renderWithRouter("/receiving", {
            store: makeStore({ storage: createMemoryStorage() }),
        });

        await goToLinesStep(user, "INV-R1");
        await selectOjAndFillQty(user);

        const stepList = screen.getByRole("list", { name: "Wizard steps" });
        const stepItems = within(stepList).getAllByRole("listitem");

        await user.click(screen.getByRole("button", { name: "Next" }));

        // onSubmitAsync is awaiting the product GET — button is disabled
        await waitFor(() =>
            expect(screen.getByRole("button", { name: "Next" })).toBeDisabled(),
        );
        expect(screen.queryByText("Product not found")).not.toBeInTheDocument();

        open();

        await waitFor(() =>
            expect(stepItems[2]).toHaveAttribute("aria-current", "step"),
        );
    });
});

describe("Race condition: restored draft on cold cache (T-R2)", () => {
    it("R2 — wizard opens at Lines from draft; Next disabled and no 'Product not found' while GET is pending; gate opens → Reconciliation", async () => {
        const { gate, open } = makeGate();
        installGatedProductHandler(gate);

        const storage = createMemoryStorage();
        saveDraft(storage, {
            step: "lines",
            document: {
                supplierId: SUPPLIER_ID,
                invoiceNumber: "INV-R2",
                date: DOCUMENT_DATE,
            },
            lines: [
                {
                    id: "line-oj-r2",
                    productId: OJ_ID,
                    expectedQuantity: 10,
                    batch: "",
                    expiryDate: "",
                },
            ],
        });

        const user = userEvent.setup();
        await renderWithRouter("/receiving", {
            store: makeStore({ storage }),
        });

        // Wizard restores at Lines step from draft
        const stepList = await screen.findByRole("list", {
            name: "Wizard steps",
        });
        const stepItems = within(stepList).getAllByRole("listitem");
        await waitFor(() =>
            expect(stepItems[1]).toHaveAttribute("aria-current", "step"),
        );
        await screen.findByRole("button", { name: "Add line" });

        await user.click(screen.getByRole("button", { name: "Next" }));

        // onSubmitAsync is awaiting the product GET — button is disabled
        await waitFor(() =>
            expect(screen.getByRole("button", { name: "Next" })).toBeDisabled(),
        );
        expect(screen.queryByText("Product not found")).not.toBeInTheDocument();

        open();

        await waitFor(() =>
            expect(stepItems[2]).toHaveAttribute("aria-current", "step"),
        );
    });
});

describe("Race condition: onChange active after failed step (T-R3)", () => {
    it("R3 — after step fails (onChange active), selecting product with GET pending never shows 'Product not found'; gate opens → Reconciliation", async () => {
        const { gate, open } = makeGate();
        installGatedProductHandler(gate);

        const user = userEvent.setup();
        await renderWithRouter("/receiving", {
            store: makeStore({ storage: createMemoryStorage() }),
        });

        await goToLinesStep(user, "INV-R3");

        const stepList = screen.getByRole("list", { name: "Wizard steps" });
        const stepItems = within(stepList).getAllByRole("listitem");

        // Click Next with an empty line → step fails, activating onChange
        await user.click(screen.getByRole("button", { name: "Next" }));
        await screen.findByText("Select a product");

        // Select product and fill quantity while gate is closed (product not in cache)
        await selectOjAndFillQty(user);

        // onChange is now active but must not surface "Product not found" while loading
        expect(screen.queryByText("Product not found")).not.toBeInTheDocument();

        // Open the gate so the pending product GET can resolve
        open();

        await user.click(screen.getByRole("button", { name: "Next" }));

        await waitFor(() =>
            expect(stepItems[2]).toHaveAttribute("aria-current", "step"),
        );
    });
});

describe("Control: 404 for selected product id shows error (T-R4)", () => {
    it("R4 — handler returns 404 for the selected product; clicking Next shows 'Product not found' and step stays on Lines", async () => {
        server.use(
            http.get("/api/products/:id", () =>
                HttpResponse.json(
                    {
                        error: {
                            code: "NOT_FOUND",
                            message: "Product not found",
                        },
                    },
                    { status: 404 },
                ),
            ),
        );

        const user = userEvent.setup();
        await renderWithRouter("/receiving", {
            store: makeStore({ storage: createMemoryStorage() }),
        });

        await goToLinesStep(user, "INV-R4");
        await selectOjAndFillQty(user);

        const stepList = screen.getByRole("list", { name: "Wizard steps" });
        const stepItems = within(stepList).getAllByRole("listitem");

        await user.click(screen.getByRole("button", { name: "Next" }));

        await screen.findByText("Product not found");
        expect(stepItems[1]).toHaveAttribute("aria-current", "step");
    });
});
