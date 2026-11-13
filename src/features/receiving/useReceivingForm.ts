// outsource dependencies
import { useRef } from "react";
import { useForm } from "@tanstack/react-form";

// local dependencies
import { useAppStore } from "@/store/hooks";
import { toLocalIsoDate } from "@/lib/date";
import type { AppStore } from "@/store/store";
import { productsApi } from "@/api/endpoints/products";
import {
    getNextStep,
    type ReceiptDraft,
    type ReceivingStep,
    type ReceiptLineDraft,
    createLinesStepSchema,
    createDocumentStepSchema,
    createReconciliationStepSchema,
} from "@/domain/receiving";

type FieldErrors = Record<string, string>;
type StepValidationResult = { form?: string; fields: FieldErrors } | undefined;

function mapIssuesToResult(
    issues: ReadonlyArray<{ path: PropertyKey[]; message: string }>,
    prefix: string,
): StepValidationResult {
    let formError: string | undefined;
    const fields: FieldErrors = {};
    for (const issue of issues) {
        if (issue.path.length === 0) {
            formError ??= issue.message;
            continue;
        }
        const path = issue.path
            .map((segment) =>
                typeof segment === "number"
                    ? `[${segment}]`
                    : `.${String(segment)}`,
            )
            .join("")
            .replace(/^\./, "");
        const key = prefix + path;
        if (!(key in fields)) {
            fields[key] = issue.message;
        }
    }
    if (formError === undefined && Object.keys(fields).length === 0) {
        return undefined;
    }
    return { form: formError, fields };
}

async function prefetchMissingProducts(
    store: AppStore,
    lines: ReceiptLineDraft[],
): Promise<void> {
    const missing = new Set<string>();
    for (const line of lines) {
        if (!line.productId) continue;
        const cached = productsApi.endpoints.getProduct.select(line.productId)(
            store.getState(),
        ).data;
        if (cached === undefined) missing.add(line.productId);
    }
    if (missing.size === 0) return;
    await Promise.all(
        Array.from(missing).map((id) =>
            store.dispatch(
                productsApi.endpoints.getProduct.initiate(id, {
                    subscribe: false,
                }),
            ),
        ),
    );
}

function validateCurrentStep(
    value: ReceiptDraft,
    supplierExists: (id: string) => boolean,
    getProduct: Parameters<typeof createLinesStepSchema>[0]["getProduct"],
): StepValidationResult {
    if (value.step === "document") {
        const schema = createDocumentStepSchema({
            supplierExists,
            today: toLocalIsoDate(new Date()),
        });
        const result = schema.safeParse(value.document);
        if (!result.success) {
            return mapIssuesToResult(result.error.issues, "document.");
        }
    }
    if (value.step === "lines") {
        const schema = createLinesStepSchema({
            getProduct,
            documentDate: value.document.date,
        });
        const result = schema.safeParse(value.lines);
        if (!result.success) {
            return mapIssuesToResult(result.error.issues, "lines");
        }
    }
    if (value.step === "reconciliation") {
        const schema = createReconciliationStepSchema({ getProduct });
        const result = schema.safeParse(value.lines);
        if (!result.success) {
            return mapIssuesToResult(result.error.issues, "lines");
        }
    }
    return undefined;
}

type UseReceivingFormOptions = {
    initialDraft: ReceiptDraft;
    supplierExists: (id: string) => boolean;
    onInvalid: () => void;
    onComplete?: () => void;
};

export function useReceivingForm({
    initialDraft,
    supplierExists,
    onInvalid,
    onComplete,
}: UseReceivingFormOptions) {
    const failedStepsRef = useRef<Set<ReceivingStep>>(new Set());
    const store = useAppStore();

    function getProduct(id: string) {
        return productsApi.endpoints.getProduct.select(id)(store.getState())
            .data;
    }

    const form = useForm({
        defaultValues: initialDraft,
        validators: {
            onChange: ({ value }) => {
                if (!failedStepsRef.current.has(value.step)) return undefined;
                // Sync onChange also runs on submit (ValidationLogic.ts:177-188),
                // so a cold cache would surface "Product not found" and short-
                // circuit onSubmitAsync before its prefetch runs. Skip while any
                // line product is still loading — onSubmitAsync is authoritative.
                if (
                    value.lines.some(
                        (l) =>
                            l.productId &&
                            getProduct(l.productId) === undefined,
                    )
                ) {
                    return undefined;
                }
                return validateCurrentStep(value, supplierExists, getProduct);
            },
            // Load any line products missing from the cache (selected product +
            // async fetch not yet resolved, or restored draft on a cold cache)
            // before running the existing sync validation. Using onSubmitAsync
            // only — a sync onSubmit would short-circuit the async pass when it
            // errors with "Product not found" before the fetch has a chance to run.
            onSubmitAsync: async ({ value }) => {
                await prefetchMissingProducts(store, value.lines);
                return validateCurrentStep(value, supplierExists, getProduct);
            },
        },
        onSubmit: ({ value }) => {
            const next = getNextStep(value.step);
            if (next) {
                changeStep(next);
            } else {
                onComplete?.();
            }
        },
        onSubmitInvalid: ({ value }) => {
            failedStepsRef.current.add(value.step);
            onInvalid();
        },
    });

    function changeStep(step: ReceivingStep): void {
        form.setErrorMap({ onSubmit: undefined });
        form.setFieldValue("step", step);
    }

    return { form, changeStep };
}

export type ReceivingForm = ReturnType<typeof useReceivingForm>["form"];
