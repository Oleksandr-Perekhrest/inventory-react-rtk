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
import { ProductCombobox } from "./ProductCombobox";
import { selectReceivingDraft } from "./receivingDraftSlice";
import { useGetProductQuery } from "@/api/endpoints/products";
import { useGetSuppliersQuery } from "@/api/endpoints/suppliers";
import { useReceivingForm, type ReceivingForm } from "./useReceivingForm";
import {
    Select,
    SelectItem,
    SelectValue,
    SelectContent,
    SelectTrigger,
} from "@/components/ui/select";
import {
    getNextStep,
    createEmptyLine,
    getPreviousStep,
    RECEIVING_STEPS,
    createEmptyDraft,
    type ReceivingStep,
} from "@/domain/receiving";

const STEP_LABELS: Record<ReceivingStep, string> = {
    document: "Document",
    lines: "Lines",
};

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
                            <LinesStep form={form} />
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
                        const back = getPreviousStep(step);
                        const next = getNextStep(step);
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

function LineUnitSuffix({ productId }: { productId: string }) {
    const { data: product } = useGetProductQuery(productId, {
        skip: !productId,
    });
    if (!product) return null;
    return (
        <div className="flex h-8 shrink-0 items-center rounded-r-sm border border-l-0 border-input bg-muted px-2.5 font-mono text-sm text-muted-foreground">
            {product.unit}
        </div>
    );
}

function LinesStep({ form }: { form: ReceivingForm }) {
    const productInputRefs = useRef<Map<string, HTMLInputElement>>(new Map());
    const addLineButtonRef = useRef<HTMLButtonElement>(null);

    function handleAddLine() {
        const newLine = createEmptyLine(crypto.randomUUID());
        form.pushFieldValue("lines", newLine);
        setTimeout(() => {
            productInputRefs.current.get(newLine.id)?.focus();
        }, 0);
    }

    function handleRemoveLine(i: number, lines: ReadonlyArray<{ id: string }>) {
        const isLast = i === lines.length - 1;
        void form.removeFieldValue("lines", i);
        setTimeout(() => {
            if (!isLast) {
                const nextLine = lines[i + 1];
                if (nextLine)
                    productInputRefs.current.get(nextLine.id)?.focus();
            } else {
                addLineButtonRef.current?.focus();
            }
        }, 0);
    }

    return (
        <div className="flex flex-col gap-3">
            <form.Field name="lines" mode="array">
                {(arrayField) => (
                    <>
                        {arrayField.state.value.map((line, i) => (
                            <div
                                key={line.id}
                                className="flex flex-col gap-3 rounded-sm border border-border bg-card p-4 lg:grid lg:grid-cols-[1fr_200px_32px] lg:items-end lg:gap-2 lg:rounded-none lg:border-0 lg:bg-transparent lg:p-0"
                            >
                                <form.Field name={`lines[${i}].productId`}>
                                    {(field) => (
                                        <FormField
                                            name={field.name}
                                            label="Product"
                                            error={firstErrorText(
                                                field.state.meta.errors,
                                            )}
                                        >
                                            {(fieldProps) => (
                                                <ProductCombobox
                                                    ref={(el) => {
                                                        if (el) {
                                                            productInputRefs.current.set(
                                                                line.id,
                                                                el,
                                                            );
                                                        } else {
                                                            productInputRefs.current.delete(
                                                                line.id,
                                                            );
                                                        }
                                                    }}
                                                    {...fieldProps}
                                                    value={field.state.value}
                                                    onChange={(productId) =>
                                                        field.handleChange(
                                                            productId,
                                                        )
                                                    }
                                                    onBlur={field.handleBlur}
                                                />
                                            )}
                                        </FormField>
                                    )}
                                </form.Field>

                                <form.Field
                                    name={`lines[${i}].expectedQuantity`}
                                >
                                    {(field) => (
                                        <FormField
                                            name={field.name}
                                            label="Expected quantity"
                                            error={firstErrorText(
                                                field.state.meta.errors,
                                            )}
                                        >
                                            {(fieldProps) => (
                                                <div className="flex">
                                                    <Input
                                                        {...fieldProps}
                                                        type="number"
                                                        inputMode="decimal"
                                                        step="any"
                                                        className="rounded-r-none border-r-0"
                                                        value={
                                                            field.state.value ??
                                                            ""
                                                        }
                                                        onChange={(e) => {
                                                            const raw =
                                                                parseFloat(
                                                                    e.target
                                                                        .value,
                                                                );
                                                            field.handleChange(
                                                                isNaN(raw)
                                                                    ? null
                                                                    : raw,
                                                            );
                                                        }}
                                                        onBlur={
                                                            field.handleBlur
                                                        }
                                                    />
                                                    <LineUnitSuffix
                                                        productId={
                                                            line.productId
                                                        }
                                                    />
                                                </div>
                                            )}
                                        </FormField>
                                    )}
                                </form.Field>

                                <Button
                                    type="button"
                                    variant="outline"
                                    size="icon"
                                    aria-label={`Remove line ${i + 1}`}
                                    disabled={
                                        arrayField.state.value.length <= 1
                                    }
                                    onClick={() =>
                                        handleRemoveLine(
                                            i,
                                            arrayField.state.value,
                                        )
                                    }
                                    className="mt-auto self-end"
                                >
                                    ×
                                </Button>
                            </div>
                        ))}
                    </>
                )}
            </form.Field>

            <Button
                ref={addLineButtonRef}
                type="button"
                variant="outline"
                className="self-start"
                onClick={handleAddLine}
            >
                Add line
            </Button>
        </div>
    );
}
