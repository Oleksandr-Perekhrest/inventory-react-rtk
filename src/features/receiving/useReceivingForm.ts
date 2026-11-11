// outsource dependencies
import { useRef } from "react";
import { useForm } from "@tanstack/react-form";

// local dependencies
import { toLocalIsoDate } from "@/lib/date";
import {
    RECEIVING_STEPS,
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
    const currentStepRef = useRef<ReceivingStep>(initialDraft.step);

    return useForm({
        defaultValues: initialDraft,
        validators: {
            onChange: ({ value }) => {
                currentStepRef.current = value.step;
                if (!failedStepsRef.current.has(value.step)) return undefined;
                return validateCurrentStep(value, supplierExists);
            },
            onSubmit: ({ value }) => {
                currentStepRef.current = value.step;
                return validateCurrentStep(value, supplierExists);
            },
        },
        onSubmit: ({ value, formApi }) => {
            const index = RECEIVING_STEPS.indexOf(value.step);
            const next = RECEIVING_STEPS[index + 1] ?? null;
            if (next) {
                formApi.setFieldValue("step", next);
            }
        },
        onSubmitInvalid: () => {
            failedStepsRef.current.add(currentStepRef.current);
            onInvalid();
        },
    });
}

export type ReceivingForm = ReturnType<typeof useReceivingForm>;
