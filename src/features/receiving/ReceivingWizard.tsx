// outsource dependencies
import type { Ref } from "react";
import { useBlocker } from "@tanstack/react-router";
import {
    useRef,
    useMemo,
    useState,
    useEffect,
    useCallback,
    useImperativeHandle,
} from "react";

// local dependencies
import { formatUnit } from "@/domain";
import { FormField } from "./FormField";
import { toLocalIsoDate } from "@/lib/date";
import { useDraftSync } from "./useDraftSync";
import { Input } from "@/components/ui/input";
import { getErrorMessage } from "@/api/errors";
import { Button } from "@/components/ui/button";
import type { Supplier } from "@/domain/supplier";
import { ProductCombobox } from "./ProductCombobox";
import { useGetSuppliersQuery } from "@/api/endpoints/suppliers";
import { useReceivingForm, type ReceivingForm } from "./useReceivingForm";
import { productsApi, useGetProductQuery } from "@/api/endpoints/products";
import { useAppStore, useAppDispatch, useAppSelector } from "@/store/hooks";
import {
    draftDiscarded,
    selectReceivingDraft,
    selectHasReceivingDraft,
} from "./receivingDraftSlice";
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
    type ReceiptLineDraft,
} from "@/domain/receiving";
import {
    AlertDialog,
    AlertDialogTitle,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogContent,
    AlertDialogDescription,
} from "@/components/ui/alert-dialog";

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

function nextIsoDay(isoDate: string): string {
    const parts = isoDate.split("-");
    const y = parts[0];
    const m = parts[1];
    const d = parts[2];
    if (!y || !m || !d) return "";
    return toLocalIsoDate(new Date(Number(y), Number(m) - 1, Number(d) + 1));
}

type InnerHandle = { cancelSync: () => void };

export function ReceivingWizard() {
    const hasDraft = useAppSelector(selectHasReceivingDraft);
    const dispatch = useAppDispatch();
    const [formKey, setFormKey] = useState(0);
    const [discardOpen, setDiscardOpen] = useState(false);
    const headingRef = useRef<HTMLHeadingElement>(null);
    const innerRef = useRef<InnerHandle>(null);

    const handleDiscardConfirm = useCallback(() => {
        innerRef.current?.cancelSync();
        dispatch(draftDiscarded());
        setFormKey((k) => k + 1);
        setDiscardOpen(false);
        queueMicrotask(() => {
            headingRef.current?.focus();
        });
    }, [dispatch]);

    return (
        <div className="p-6">
            <div className="mb-6 flex items-center justify-between gap-4">
                <h1
                    ref={headingRef}
                    tabIndex={-1}
                    className="text-2xl font-semibold outline-none"
                >
                    Receiving
                </h1>
                {hasDraft && (
                    <Button
                        type="button"
                        variant="outline"
                        onClick={() => setDiscardOpen(true)}
                    >
                        Discard draft
                    </Button>
                )}
            </div>

            <ReceivingWizardInner key={formKey} ref={innerRef} />

            <AlertDialog open={discardOpen} onOpenChange={setDiscardOpen}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>
                            Discard this receipt draft?
                        </AlertDialogTitle>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                            variant="destructive"
                            onClick={handleDiscardConfirm}
                        >
                            Discard
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
}

function ReceivingWizardInner({ ref }: { ref: Ref<InnerHandle> }) {
    const dispatch = useAppDispatch();
    const persistedDraft = useAppSelector(selectReceivingDraft);
    const store = useAppStore();
    const [initialDraft] = useState(
        () =>
            persistedDraft ??
            createEmptyDraft(toLocalIsoDate(new Date()), crypto.randomUUID()),
    );
    const [linesComplete, setLinesComplete] = useState(false);

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

    const { form } = useReceivingForm({
        initialDraft,
        supplierExists,
        onComplete: () => setLinesComplete(true),
        onInvalid: () => {
            setLinesComplete(false);
            queueMicrotask(() => {
                const invalid = formRef.current?.querySelector<HTMLElement>(
                    '[aria-invalid="true"]',
                );
                invalid?.focus();
            });
        },
    });

    const draftSync = useDraftSync(form);

    useImperativeHandle(ref, () => ({ cancelSync: draftSync.cancel }), [
        draftSync.cancel,
    ]);

    const blocker = useBlocker({
        shouldBlockFn: () => {
            draftSync.flush();
            return selectHasReceivingDraft(store.getState());
        },
        withResolver: true,
        enableBeforeUnload: false,
    });

    const handleBlockerOpenChange = useCallback(
        (open: boolean) => {
            if (!open && blocker.status === "blocked") {
                blocker.reset();
            }
        },
        [blocker],
    );

    const handleStay = useCallback(() => {
        if (blocker.status === "blocked") blocker.reset();
    }, [blocker]);

    const handleDiscardAndLeave = useCallback(() => {
        if (blocker.status === "blocked") {
            dispatch(draftDiscarded());
            blocker.proceed();
        }
    }, [blocker, dispatch]);

    const handleKeepAndLeave = useCallback(() => {
        if (blocker.status === "blocked") blocker.proceed();
    }, [blocker]);

    // Reset the completion notice whenever form values change
    const prevValuesRef = useRef(form.state.values);
    useEffect(() => {
        const sub = form.store.subscribe((state) => {
            if (state.values !== prevValuesRef.current) {
                prevValuesRef.current = state.values;
                setLinesComplete(false);
            }
        });
        return () => sub.unsubscribe();
    }, [form.store]);

    const handleFormSubmit = useCallback(
        (event: React.FormEvent<HTMLFormElement>) => {
            event.preventDefault();
            event.stopPropagation();
            void form.handleSubmit();
        },
        [form],
    );

    return (
        <>
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

                <form.Subscribe
                    selector={(state) => ({
                        step: state.values.step,
                        lines: state.values.lines,
                        documentDate: state.values.document.date,
                    })}
                >
                    {({ step: currentStep, documentDate, lines }) =>
                        currentStep === "document" ? (
                            <DocumentStep
                                form={form}
                                suppliers={suppliers}
                                suppliersLoading={suppliersQuery.isLoading}
                                suppliersError={suppliersQuery.error}
                                refetchSuppliers={suppliersQuery.refetch}
                            />
                        ) : (
                            <LinesStep
                                form={form}
                                documentDate={documentDate}
                                lines={lines}
                            />
                        )
                    }
                </form.Subscribe>

                <form.Subscribe
                    selector={(state) => ({
                        step: state.values.step,
                        isSubmitting: state.isSubmitting,
                        lines: state.values.lines,
                    })}
                >
                    {({ step, isSubmitting, lines }) => {
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
                                {next ? (
                                    <Button
                                        type="submit"
                                        disabled={
                                            isSubmitting || suppliersUnavailable
                                        }
                                    >
                                        Next
                                    </Button>
                                ) : (
                                    <LinesSubmitButton
                                        isSubmitting={isSubmitting}
                                        lines={lines}
                                        linesComplete={linesComplete}
                                    />
                                )}
                            </div>
                        );
                    }}
                </form.Subscribe>
            </form>

            <AlertDialog
                open={blocker.status === "blocked"}
                onOpenChange={handleBlockerOpenChange}
            >
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Unfinished receipt</AlertDialogTitle>
                        <AlertDialogDescription>
                            You have an unfinished receipt. Its draft is saved
                            on this device.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel autoFocus onClick={handleStay}>
                            Stay
                        </AlertDialogCancel>
                        <AlertDialogAction
                            variant="destructive"
                            onClick={handleDiscardAndLeave}
                        >
                            Discard and leave
                        </AlertDialogAction>
                        <AlertDialogAction onClick={handleKeepAndLeave}>
                            Keep draft and leave
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </>
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
                                        value={field.state.value}
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
            {formatUnit(product.unit)}
        </div>
    );
}

type LineRowProps = {
    form: ReceivingForm;
    i: number;
    line: ReceiptLineDraft;
    totalLines: number;
    documentDate: string;
    retryCount: number;
    productInputRef: (el: HTMLInputElement | null) => void;
    onRemove: () => void;
};

function LineRow({
    form,
    i,
    line,
    totalLines,
    documentDate,
    retryCount,
    productInputRef,
    onRemove,
}: LineRowProps) {
    const {
        data: product,
        isError,
        refetch,
    } = useGetProductQuery(line.productId, { skip: !line.productId });
    const minExpiryDate = nextIsoDay(documentDate);

    const lastRetryRef = useRef(0);
    useEffect(() => {
        if (retryCount > lastRetryRef.current) {
            lastRetryRef.current = retryCount;
            if (line.productId && isError) void refetch();
        }
    }, [retryCount, line.productId, isError, refetch]);

    return (
        <div className="flex flex-col gap-3 rounded-sm border border-border bg-card p-4">
            <div className="flex flex-col gap-3 lg:grid lg:grid-cols-[1fr_200px_32px] lg:items-end lg:gap-2">
                <form.Field name={`lines[${i}].productId`}>
                    {(field) => (
                        <FormField
                            name={field.name}
                            label="Product"
                            error={firstErrorText(field.state.meta.errors)}
                        >
                            {(fieldProps) => (
                                <ProductCombobox
                                    ref={productInputRef}
                                    {...fieldProps}
                                    value={field.state.value}
                                    onChange={(p) => {
                                        field.handleChange(p.id);
                                        if (!p.perishable) {
                                            form.setFieldValue(
                                                `lines[${i}].batch`,
                                                "",
                                            );
                                            form.setFieldValue(
                                                `lines[${i}].expiryDate`,
                                                "",
                                            );
                                        }
                                    }}
                                    onBlur={field.handleBlur}
                                />
                            )}
                        </FormField>
                    )}
                </form.Field>

                <form.Field name={`lines[${i}].expectedQuantity`}>
                    {(field) => (
                        <FormField
                            name={field.name}
                            label="Expected quantity"
                            error={firstErrorText(field.state.meta.errors)}
                        >
                            {(fieldProps) => (
                                <div className="flex">
                                    <Input
                                        {...fieldProps}
                                        type="number"
                                        inputMode="decimal"
                                        step="any"
                                        className="rounded-r-none border-r-0"
                                        value={field.state.value ?? ""}
                                        onChange={(e) => {
                                            const raw = parseFloat(
                                                e.target.value,
                                            );
                                            field.handleChange(
                                                isNaN(raw) ? null : raw,
                                            );
                                        }}
                                        onBlur={field.handleBlur}
                                    />
                                    <LineUnitSuffix
                                        productId={line.productId}
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
                    disabled={totalLines <= 1}
                    onClick={onRemove}
                    className="mt-auto self-end"
                >
                    ×
                </Button>
            </div>

            {product?.perishable && (
                <div className="grid gap-3 lg:grid-cols-2">
                    <form.Field name={`lines[${i}].batch`}>
                        {(field) => (
                            <FormField
                                name={field.name}
                                label="Batch"
                                error={firstErrorText(field.state.meta.errors)}
                            >
                                {(fieldProps) => (
                                    <Input
                                        {...fieldProps}
                                        name={field.name}
                                        value={field.state.value}
                                        onChange={(e) =>
                                            field.handleChange(e.target.value)
                                        }
                                        onBlur={field.handleBlur}
                                    />
                                )}
                            </FormField>
                        )}
                    </form.Field>

                    <form.Field name={`lines[${i}].expiryDate`}>
                        {(field) => (
                            <FormField
                                name={field.name}
                                label="Expiry date"
                                error={firstErrorText(field.state.meta.errors)}
                            >
                                {(fieldProps) => (
                                    <Input
                                        {...fieldProps}
                                        name={field.name}
                                        type="date"
                                        min={minExpiryDate}
                                        value={field.state.value}
                                        onChange={(e) =>
                                            field.handleChange(e.target.value)
                                        }
                                        onBlur={field.handleBlur}
                                    />
                                )}
                            </FormField>
                        )}
                    </form.Field>
                </div>
            )}
        </div>
    );
}

type LinesSubmitButtonProps = {
    isSubmitting: boolean;
    lines: ReceiptLineDraft[];
    linesComplete: boolean;
};

function LinesSubmitButton({
    isSubmitting,
    lines,
    linesComplete,
}: LinesSubmitButtonProps) {
    const anyProductNotReady = useAppSelector((rootState) =>
        lines.some((line) => {
            if (!line.productId) return false;
            return (
                productsApi.endpoints.getProduct.select(line.productId)(
                    rootState,
                ).status !== "fulfilled"
            );
        }),
    );

    return (
        <>
            <Button type="submit" disabled={isSubmitting || anyProductNotReady}>
                Continue
            </Button>
            <p role="status" className="w-full text-sm text-muted-foreground">
                {linesComplete
                    ? "Lines are complete — reconciliation comes in the next stage."
                    : ""}
            </p>
        </>
    );
}

type LinesStepProps = {
    form: ReceivingForm;
    documentDate: string;
    lines: ReceiptLineDraft[];
};

function LinesStep({ form, documentDate, lines }: LinesStepProps) {
    const productInputRefs = useRef<Map<string, HTMLInputElement>>(new Map());
    const addLineButtonRef = useRef<HTMLButtonElement>(null);
    const [retryCount, setRetryCount] = useState(0);

    const anyRejected = useAppSelector((rootState) =>
        lines.some(
            (l) =>
                l.productId &&
                productsApi.endpoints.getProduct.select(l.productId)(rootState)
                    .status === "rejected",
        ),
    );

    function handleAddLine() {
        const newLine = createEmptyLine(crypto.randomUUID());
        form.pushFieldValue("lines", newLine);
        setTimeout(() => {
            productInputRefs.current.get(newLine.id)?.focus();
        }, 0);
    }

    function handleRemoveLine(i: number, lns: ReadonlyArray<{ id: string }>) {
        const isLast = i === lns.length - 1;
        void form.removeFieldValue("lines", i);
        setTimeout(() => {
            if (!isLast) {
                const nextLine = lns[i + 1];
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
                            <LineRow
                                key={line.id}
                                form={form}
                                i={i}
                                line={line}
                                totalLines={arrayField.state.value.length}
                                documentDate={documentDate}
                                retryCount={retryCount}
                                productInputRef={(el) => {
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
                                onRemove={() =>
                                    handleRemoveLine(i, arrayField.state.value)
                                }
                            />
                        ))}
                        {firstErrorText(arrayField.state.meta.errors) && (
                            <p className="text-sm text-destructive">
                                {firstErrorText(arrayField.state.meta.errors)}
                            </p>
                        )}
                    </>
                )}
            </form.Field>

            {anyRejected && (
                <div className="flex items-center gap-2 text-sm text-destructive">
                    <span>Some products could not be loaded.</span>
                    <Button
                        type="button"
                        size="xs"
                        variant="outline"
                        onClick={() => setRetryCount((c) => c + 1)}
                    >
                        Retry
                    </Button>
                </div>
            )}

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
