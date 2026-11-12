// outsource dependencies
import { useRef } from "react";
import { useForm } from "@tanstack/react-form";

// local dependencies
import { toLocalIsoDate } from "@/lib/date";
import { useAppStore } from "@/store/hooks";
import { productsApi } from "@/api/endpoints/products";
import {
    getNextStep,
    type ReceiptDraft,
    type ReceivingStep,
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
                return validateCurrentStep(value, supplierExists, getProduct);
            },
            onSubmit: ({ value }) => {
                return validateCurrentStep(value, supplierExists, getProduct);
            },
        },
        onSubmit: ({ value, formApi }) => {
            const next = getNextStep(value.step);
            if (next) {
                formApi.setFieldValue("step", next);
            } else {
                onComplete?.();
            }
        },
        onSubmitInvalid: ({ value }) => {
            failedStepsRef.current.add(value.step);
            onInvalid();
        },
    });

    return { form };
}

export type ReceivingForm = ReturnType<typeof useReceivingForm>["form"];
