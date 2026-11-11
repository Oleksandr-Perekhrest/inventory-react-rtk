// outsource dependencies
import { useRef } from "react";
import { useForm } from "@tanstack/react-form";

// local dependencies
import { toLocalIsoDate } from "@/lib/date";
import {
    getNextStep,
    type ReceiptDraft,
    type ReceivingStep,
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
    return undefined;
}

type UseReceivingFormOptions = {
    initialDraft: ReceiptDraft;
    supplierExists: (id: string) => boolean;
    onInvalid: () => void;
};

export function useReceivingForm({
    initialDraft,
    supplierExists,
    onInvalid,
}: UseReceivingFormOptions) {
    const failedStepsRef = useRef<Set<ReceivingStep>>(new Set());

    return useForm({
        defaultValues: initialDraft,
        validators: {
            onChange: ({ value }) => {
                if (!failedStepsRef.current.has(value.step)) return undefined;
                return validateCurrentStep(value, supplierExists);
            },
            onSubmit: ({ value }) => {
                return validateCurrentStep(value, supplierExists);
            },
        },
        onSubmit: ({ value, formApi }) => {
            const next = getNextStep(value.step);
            if (next) {
                formApi.setFieldValue("step", next);
            }
        },
        onSubmitInvalid: ({ value }) => {
            failedStepsRef.current.add(value.step);
            onInvalid();
        },
    });
}

export type ReceivingForm = ReturnType<typeof useReceivingForm>;
