// outsource dependencies
import { useRef, useMemo, useState, useCallback } from "react";

// local dependencies
import { FormField } from "./FormField";
import { toLocalIsoDate } from "@/lib/date";
import { Input } from "@/components/ui/input";
import { getErrorMessage } from "@/api/errors";
import { useAppSelector } from "@/store/hooks";
import { Button } from "@/components/ui/button";
import type { Supplier } from "@/domain/supplier";
import { selectReceivingDraft } from "./receivingDraftSlice";
import { useGetSuppliersQuery } from "@/api/endpoints/suppliers";
import { useReceivingForm, type ReceivingForm } from "./useReceivingForm";
import {
    RECEIVING_STEPS,
    createEmptyDraft,
    type ReceivingStep,
} from "@/domain/receiving";
import {
    Select,
    SelectItem,
    SelectValue,
    SelectContent,
    SelectTrigger,
} from "@/components/ui/select";

const STEP_LABELS: Record<ReceivingStep, string> = {
    document: "Document",
    lines: "Lines",
};

function nextStepOf(step: ReceivingStep): ReceivingStep | null {
    const index = RECEIVING_STEPS.indexOf(step);
    return RECEIVING_STEPS[index + 1] ?? null;
}

function previousStepOf(step: ReceivingStep): ReceivingStep | null {
    const index = RECEIVING_STEPS.indexOf(step);
    return index > 0 ? (RECEIVING_STEPS[index - 1] ?? null) : null;
}

function firstErrorText(errors: ReadonlyArray<unknown>): string | undefined {
    for (const error of errors) {
        if (typeof error === "string" && error.length > 0) return error;
    }
    return undefined;
}

export function ReceivingWizard() {
    const persistedDraft = useAppSelector(selectReceivingDraft);
    const [initialDraft] = useState(
        () =>
            persistedDraft ??
            createEmptyDraft(toLocalIsoDate(new Date()), crypto.randomUUID()),
    );

    const suppliersQuery = useGetSuppliersQuery();
    const suppliers = suppliersQuery.data;
    const supplierIdSet = useMemo(
        () => new Set((suppliers ?? []).map((s) => s.id)),
        [suppliers],
    );
    const supplierExists = useCallback(
        (id: string) => supplierIdSet.has(id),
        [supplierIdSet],
    );

    const formRef = useRef<HTMLFormElement>(null);

    const form = useReceivingForm({
        initialDraft,
        supplierExists,
        onInvalid: () => {
            queueMicrotask(() => {
                const invalid = formRef.current?.querySelector<HTMLElement>(
                    '[aria-invalid="true"]',
                );
                invalid?.focus();
            });
        },
    });

    const handleFormSubmit = useCallback(
        (event: React.FormEvent<HTMLFormElement>) => {
            event.preventDefault();
            event.stopPropagation();
            void form.handleSubmit();
        },
        [form],
    );

    return (
        <div className="p-6">
            <h1 className="mb-6 text-2xl font-semibold">Receiving</h1>
            <form
                ref={formRef}
                onSubmit={handleFormSubmit}
                noValidate
                className="mx-auto flex max-w-xl flex-col gap-6"
            >
                <form.Subscribe selector={(state) => state.values.step}>
                    {(currentStep) => (
                        <StepIndicator currentStep={currentStep} />
                    )}
                </form.Subscribe>

                <form.Subscribe selector={(state) => state.values.step}>
                    {(currentStep) =>
                        currentStep === "document" ? (
                            <DocumentStep
                                form={form}
                                suppliers={suppliers}
                                suppliersLoading={suppliersQuery.isLoading}
                                suppliersError={suppliersQuery.error}
                                refetchSuppliers={suppliersQuery.refetch}
                            />
                        ) : (
                            <LinesStep />
                        )
                    }
                </form.Subscribe>

                <form.Subscribe
                    selector={(state) => ({
                        step: state.values.step,
                        isSubmitting: state.isSubmitting,
                    })}
                >
                    {({ step, isSubmitting }) => {
                        const back = previousStepOf(step);
                        const next = nextStepOf(step);
                        const suppliersUnavailable =
                            step === "document" &&
                            (suppliersQuery.isLoading ||
                                Boolean(suppliersQuery.error));
                        return (
                            <div className="flex flex-wrap items-center justify-between gap-2">
                                <Button
                                    type="button"
                                    variant="outline"
                                    disabled={!back}
                                    onClick={() => {
                                        if (back) {
                                            form.setFieldValue("step", back);
                                        }
                                    }}
                                >
                                    Back
                                </Button>
                                {next && (
                                    <Button
                                        type="submit"
                                        disabled={
                                            isSubmitting || suppliersUnavailable
                                        }
                                    >
                                        Next
                                    </Button>
                                )}
                            </div>
                        );
                    }}
                </form.Subscribe>
            </form>
        </div>
    );
}

function StepIndicator({ currentStep }: { currentStep: ReceivingStep }) {
    return (
        <ol className="flex flex-wrap gap-2" aria-label="Wizard steps">
            {RECEIVING_STEPS.map((step, index) => {
                const isCurrent = step === currentStep;
                return (
                    <li
                        key={step}
                        aria-current={isCurrent ? "step" : undefined}
                        className={
                            "flex items-center gap-2 rounded-sm border px-3 py-1.5 text-sm " +
                            (isCurrent
                                ? "border-primary bg-primary/10 text-foreground"
                                : "border-border bg-card text-muted-foreground")
                        }
                    >
                        <span className="font-mono text-xs">{index + 1}</span>
                        <span>{STEP_LABELS[step]}</span>
                    </li>
                );
            })}
        </ol>
    );
}

type DocumentStepProps = {
    form: ReceivingForm;
    suppliers: Supplier[] | undefined;
    suppliersLoading: boolean;
    suppliersError: ReturnType<typeof useGetSuppliersQuery>["error"];
    refetchSuppliers: () => void;
};

function DocumentStep({
    form,
    suppliers,
    suppliersLoading,
    suppliersError,
    refetchSuppliers,
}: DocumentStepProps) {
    return (
        <div className="flex flex-col gap-4 rounded-sm border border-border bg-card p-4">
            <form.Field name="document.supplierId">
                {(field) => {
                    const isDisabled =
                        suppliersLoading || Boolean(suppliersError);
                    return (
                        <FormField
                            name={field.name}
                            label="Supplier"
                            error={firstErrorText(field.state.meta.errors)}
                        >
                            {(fieldProps) => (
                                <>
                                    <Select
                                        value={field.state.value || undefined}
                                        onValueChange={(v) =>
                                            field.handleChange(v)
                                        }
                                        disabled={isDisabled}
                                    >
                                        <SelectTrigger
                                            {...fieldProps}
                                            onBlur={field.handleBlur}
                                            className="w-full"
                                        >
                                            <SelectValue
                                                placeholder={
                                                    suppliersLoading
                                                        ? "Loading suppliers..."
                                                        : suppliersError
                                                          ? "Failed to load suppliers"
                                                          : "Select a supplier"
                                                }
                                            />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {(suppliers ?? []).map(
                                                (supplier) => (
                                                    <SelectItem
                                                        key={supplier.id}
                                                        value={supplier.id}
                                                    >
                                                        {supplier.name}
                                                    </SelectItem>
                                                ),
                                            )}
                                        </SelectContent>
                                    </Select>
                                    {suppliersError && (
                                        <div className="flex items-center gap-2 text-sm text-destructive">
                                            <span>
                                                {getErrorMessage(
                                                    suppliersError,
                                                )}
                                            </span>
                                            <Button
                                                type="button"
                                                size="xs"
                                                variant="outline"
                                                onClick={() =>
                                                    refetchSuppliers()
                                                }
                                            >
                                                Retry
                                            </Button>
                                        </div>
                                    )}
                                </>
                            )}
                        </FormField>
                    );
                }}
            </form.Field>

            <form.Field name="document.invoiceNumber">
                {(field) => (
                    <FormField
                        name={field.name}
                        label="Invoice number"
                        error={firstErrorText(field.state.meta.errors)}
                    >
                        {(fieldProps) => (
                            <Input
                                {...fieldProps}
                                name={field.name}
                                value={field.state.value}
                                onChange={(event) =>
                                    field.handleChange(event.target.value)
                                }
                                onBlur={field.handleBlur}
                            />
                        )}
                    </FormField>
                )}
            </form.Field>

            <form.Field name="document.date">
                {(field) => (
                    <FormField
                        name={field.name}
                        label="Date"
                        error={firstErrorText(field.state.meta.errors)}
                    >
                        {(fieldProps) => (
                            <Input
                                {...fieldProps}
                                name={field.name}
                                type="date"
                                value={field.state.value}
                                onChange={(event) =>
                                    field.handleChange(event.target.value)
                                }
                                onBlur={field.handleBlur}
                            />
                        )}
                    </FormField>
                )}
            </form.Field>
        </div>
    );
}

function LinesStep() {
    return (
        <div className="rounded-sm border border-dashed border-border bg-card p-6 text-sm text-muted-foreground">
            Lines step — coming next
        </div>
    );
}
