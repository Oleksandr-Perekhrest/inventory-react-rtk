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
} from "@/domain/receiving";

type FieldErrors = Record<string, string>;
type StepValidationResult = { fields: FieldErrors } | undefined;

function mapIssuesToFields(
    issues: ReadonlyArray<{ path: PropertyKey[]; message: string }>,
    prefix: string,
): FieldErrors {
    const errors: FieldErrors = {};
    for (const issue of issues) {
        const path = issue.path
            .map((segment) =>
                typeof segment === "number"
                    ? `[${segment}]`
                    : `.${String(segment)}`,
            )
            .join("")
            .replace(/^\./, "");
        const key = prefix + path;
        if (!(key in errors)) {
            errors[key] = issue.message;
        }
    }
    return errors;
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
            return {
                fields: mapIssuesToFields(result.error.issues, "document."),
            };
        }
    }
    if (value.step === "lines") {
        const schema = createLinesStepSchema({
            getProduct,
            documentDate: value.document.date,
        });
        const result = schema.safeParse(value.lines);
        if (!result.success) {
            return {
                fields: mapIssuesToFields(result.error.issues, "lines"),
            };
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

    const clearFailedSteps = () => {
        failedStepsRef.current.clear();
    };

    return { form, clearFailedSteps };
}

export type ReceivingForm = ReturnType<typeof useReceivingForm>["form"];
