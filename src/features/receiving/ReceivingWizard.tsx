// outsource dependencies
import type { Ref } from "react";
import { Link, useBlocker } from "@tanstack/react-router";
import {
    useId,
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
import { Button } from "@/components/ui/button";
import type { Supplier } from "@/domain/supplier";
import type { ReceiptResponse } from "@/api/types";
import { ProductCombobox } from "@/components/ProductCombobox";
import { isApiErrorData, getErrorMessage } from "@/api/errors";
import { useGetSuppliersQuery } from "@/api/endpoints/suppliers";
import { usePostReceiptMutation } from "@/api/endpoints/receipts";
import { useReceivingForm, type ReceivingForm } from "./useReceivingForm";
import { productsApi, useGetProductQuery } from "@/api/endpoints/products";
import { useAppStore, useAppDispatch, useAppSelector } from "@/store/hooks";
import {
    Select,
    SelectItem,
    SelectValue,
    SelectContent,
    SelectTrigger,
} from "@/components/ui/select";
import {
    draftDiscarded,
    selectResetNonce,
    selectReceivingDraft,
    selectHasReceivingDraft,
} from "./receivingDraftSlice";
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
import {
    getNextStep,
    hasDiscrepancy,
    createEmptyLine,
    getPreviousStep,
    RECEIVING_STEPS,
    createEmptyDraft,
    getActualQuantity,
    type ReceivingStep,
    buildReceiptPayload,
    type ReceiptLineDraft,
} from "@/domain/receiving";

const STEP_LABELS: Record<ReceivingStep, string> = {
    document: "Document",
    lines: "Lines",
    reconciliation: "Reconciliation",
    review: "Review",
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

function formatDiff(diff: number, unit: string): string {
    const sign = diff >= 0 ? "+" : "−";
    const absStr = String(parseFloat(Math.abs(diff).toFixed(3)));
    return `${sign}${absStr} ${unit}`;
}

type InnerHandle = { cancelSync: () => void };

type PostedState = { response: ReceiptResponse; supplierName: string };

export function ReceivingWizard() {
    const hasDraft = useAppSelector(selectHasReceivingDraft);
    const resetNonce = useAppSelector(selectResetNonce);
    const dispatch = useAppDispatch();
    const [formKey, setFormKey] = useState(0);
    const [discardOpen, setDiscardOpen] = useState(false);
    const [posted, setPosted] = useState<PostedState | null>(null);
    const headingRef = useRef<HTMLHeadingElement>(null);
    const innerRef = useRef<InnerHandle>(null);
    const isFirstResetRef = useRef(true);

    useEffect(() => {
        if (isFirstResetRef.current) {
            isFirstResetRef.current = false;
            return;
        }
        innerRef.current?.cancelSync();
        setPosted(null);
        setFormKey((k) => k + 1);
        queueMicrotask(() => {
            headingRef.current?.focus();
        });
    }, [resetNonce]);

    const handleDiscardConfirm = useCallback(() => {
        innerRef.current?.cancelSync();
        dispatch(draftDiscarded());
        setFormKey((k) => k + 1);
        setDiscardOpen(false);
        queueMicrotask(() => {
            headingRef.current?.focus();
        });
    }, [dispatch]);

    const handlePosted = useCallback(
        (response: ReceiptResponse, supplierName: string) => {
            innerRef.current?.cancelSync();
            dispatch(draftDiscarded());
            setPosted({ response, supplierName });
        },
        [dispatch],
    );

    const handleNewReceipt = useCallback(() => {
        setPosted(null);
        setFormKey((k) => k + 1);
        queueMicrotask(() => {
            headingRef.current?.focus();
        });
    }, []);

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
                {hasDraft && !posted && (
                    <Button
                        type="button"
                        variant="outline"
                        onClick={() => setDiscardOpen(true)}
                    >
                        Discard draft
                    </Button>
                )}
            </div>

            {posted ? (
                <SuccessView posted={posted} onNewReceipt={handleNewReceipt} />
            ) : (
                <ReceivingWizardInner
                    key={formKey}
                    ref={innerRef}
                    onPosted={handlePosted}
                />
            )}

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

type SuccessViewProps = {
    posted: PostedState;
    onNewReceipt: () => void;
};

function SuccessView({ posted, onNewReceipt }: SuccessViewProps) {
    const headingRef = useRef<HTMLHeadingElement>(null);

    useEffect(() => {
        headingRef.current?.focus();
    }, []);

    const { response, supplierName } = posted;

    return (
        <div className="mx-auto flex max-w-xl flex-col gap-6">
            <div className="rounded-sm border border-border bg-card p-6">
                <h2
                    ref={headingRef}
                    tabIndex={-1}
                    className="mb-4 text-lg font-semibold outline-none"
                >
                    Receipt posted
                </h2>
                <dl className="flex flex-col gap-2 text-sm">
                    <div className="flex gap-2">
                        <dt className="text-muted-foreground">Invoice</dt>
                        <dd className="font-mono">{response.invoiceNumber}</dd>
                    </div>
                    <div className="flex gap-2">
                        <dt className="text-muted-foreground">Supplier</dt>
                        <dd>{supplierName}</dd>
                    </div>
                    <div className="flex gap-2">
                        <dt className="text-muted-foreground">Date</dt>
                        <dd className="font-mono">{response.date}</dd>
                    </div>
                    <div className="flex gap-2">
                        <dt className="text-muted-foreground">Lines</dt>
                        <dd>
                            {response.lineCount}{" "}
                            {response.lineCount === 1 ? "line" : "lines"}{" "}
                            &middot; {response.discrepancyCount} with{" "}
                            {response.discrepancyCount === 1
                                ? "discrepancy"
                                : "discrepancies"}
                        </dd>
                    </div>
                </dl>
            </div>
            <div className="flex flex-wrap gap-2">
                <Button type="button" onClick={onNewReceipt}>
                    New receipt
                </Button>
                <Button type="button" variant="outline" asChild>
                    <Link to="/catalog">Go to catalog</Link>
                </Button>
            </div>
        </div>
    );
}

type InnerProps = {
    ref: Ref<InnerHandle>;
    onPosted: (response: ReceiptResponse, supplierName: string) => void;
};

function ReceivingWizardInner({ ref, onPosted }: InnerProps) {
    const dispatch = useAppDispatch();
    const persistedDraft = useAppSelector(selectReceivingDraft);
    const store = useAppStore();
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

    const [postReceipt] = usePostReceiptMutation();
    const [isPosting, setIsPosting] = useState(false);
    const [postError, setPostError] = useState<string | null>(null);
    const [invoiceServerError, setInvoiceServerError] = useState<string | null>(
        null,
    );

    const invoiceNumberRef = useRef<HTMLInputElement>(null);
    const formRef = useRef<HTMLFormElement>(null);

    const { form, changeStep } = useReceivingForm({
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

    const handlePost = useCallback(async () => {
        setPostError(null);
        setIsPosting(true);
        const values = form.state.values;
        const payload = buildReceiptPayload(values);
        try {
            const response = await postReceipt(payload).unwrap();
            const supplierName =
                suppliers?.find((s) => s.id === values.document.supplierId)
                    ?.name ?? values.document.supplierId;
            onPosted(response, supplierName);
        } catch (err) {
            if (
                isApiErrorData(err) &&
                err.status === 409 &&
                err.code === "DUPLICATE_INVOICE"
            ) {
                form.setErrorMap({ onSubmit: undefined });
                form.setFieldValue("step", "document");
                setInvoiceServerError(err.message);
            } else {
                setPostError(
                    getErrorMessage(isApiErrorData(err) ? err : undefined),
                );
            }
            setIsPosting(false);
        }
    }, [form, postReceipt, suppliers, onPosted]);

    const draftSync = useDraftSync(form);

    useImperativeHandle(ref, () => ({ cancelSync: draftSync.cancel }), [
        draftSync.cancel,
    ]);

    useEffect(() => {
        if (invoiceServerError !== null) {
            invoiceNumberRef.current?.focus();
        }
    }, [invoiceServerError]);

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
                        supplierId: state.values.document.supplierId,
                        invoiceNumber: state.values.document.invoiceNumber,
                        documentDate: state.values.document.date,
                    })}
                >
                    {({
                        step: currentStep,
                        documentDate,
                        lines,
                        supplierId,
                        invoiceNumber,
                    }) =>
                        currentStep === "document" ? (
                            <DocumentStep
                                form={form}
                                suppliers={suppliers}
                                suppliersLoading={suppliersQuery.isLoading}
                                suppliersError={suppliersQuery.error}
                                refetchSuppliers={suppliersQuery.refetch}
                                invoiceNumberRef={invoiceNumberRef}
                                invoiceServerError={invoiceServerError}
                                onClearInvoiceServerError={() =>
                                    setInvoiceServerError(null)
                                }
                            />
                        ) : currentStep === "lines" ? (
                            <LinesStep
                                form={form}
                                documentDate={documentDate}
                                lines={lines}
                            />
                        ) : currentStep === "reconciliation" ? (
                            <ReconciliationStep form={form} lines={lines} />
                        ) : (
                            <ReviewStep
                                suppliers={suppliers}
                                supplierId={supplierId}
                                invoiceNumber={invoiceNumber}
                                date={documentDate}
                                lines={lines}
                            />
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
                        const isReview = step === "review";
                        const suppliersUnavailable =
                            step === "document" &&
                            (suppliersQuery.isLoading ||
                                Boolean(suppliersQuery.error));
                        return (
                            <div className="flex flex-col gap-2">
                                <div className="flex flex-wrap items-center justify-between gap-2">
                                    <Button
                                        type="button"
                                        variant="outline"
                                        disabled={
                                            !back || isSubmitting || isPosting
                                        }
                                        onClick={() => {
                                            if (back) {
                                                changeStep(back);
                                            }
                                        }}
                                    >
                                        Back
                                    </Button>
                                    {next !== null ? (
                                        <Button
                                            type="submit"
                                            disabled={
                                                isSubmitting ||
                                                suppliersUnavailable
                                            }
                                        >
                                            Next
                                        </Button>
                                    ) : isReview ? (
                                        <Button
                                            type="button"
                                            onClick={handlePost}
                                            disabled={isPosting}
                                        >
                                            {isPosting
                                                ? "Posting…"
                                                : "Post receipt"}
                                        </Button>
                                    ) : null}
                                </div>
                                {isReview && postError && (
                                    <p
                                        role="alert"
                                        className="text-sm text-destructive"
                                    >
                                        {postError}
                                    </p>
                                )}
                                {step === "reconciliation" && (
                                    <form.Subscribe
                                        selector={(s) =>
                                            firstErrorText(s.errors)
                                        }
                                    >
                                        {(formError) =>
                                            formError ? (
                                                <p
                                                    role="alert"
                                                    className="text-sm text-destructive"
                                                >
                                                    {formError}
                                                </p>
                                            ) : null
                                        }
                                    </form.Subscribe>
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
    invoiceNumberRef: React.RefObject<HTMLInputElement | null>;
    invoiceServerError: string | null;
    onClearInvoiceServerError: () => void;
};

function DocumentStep({
    form,
    suppliers,
    suppliersLoading,
    suppliersError,
    refetchSuppliers,
    invoiceNumberRef,
    invoiceServerError,
    onClearInvoiceServerError,
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
                                        onValueChange={(v) => {
                                            field.handleChange(v);
                                            if (invoiceServerError !== null) {
                                                onClearInvoiceServerError();
                                            }
                                        }}
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
                        error={
                            firstErrorText(field.state.meta.errors) ??
                            invoiceServerError ??
                            undefined
                        }
                    >
                        {(fieldProps) => (
                            <Input
                                {...fieldProps}
                                ref={invoiceNumberRef}
                                name={field.name}
                                value={field.state.value}
                                onChange={(event) => {
                                    field.handleChange(event.target.value);
                                    if (invoiceServerError !== null) {
                                        onClearInvoiceServerError();
                                    }
                                }}
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
                    </>
                )}
            </form.Field>
            <form.Subscribe selector={(s) => firstErrorText(s.errors)}>
                {(formError) =>
                    formError ? (
                        <p className="text-sm text-destructive">{formError}</p>
                    ) : null
                }
            </form.Subscribe>

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

type ReconciliationStepProps = {
    form: ReceivingForm;
    lines: ReceiptLineDraft[];
};

function ReconciliationStep({ form, lines }: ReconciliationStepProps) {
    const discrepancyCount = lines.filter(hasDiscrepancy).length;
    return (
        <div className="flex flex-col gap-3">
            <p className="text-sm text-muted-foreground">
                {lines.length} {lines.length === 1 ? "line" : "lines"} &middot;{" "}
                {discrepancyCount} with{" "}
                {discrepancyCount === 1 ? "discrepancy" : "discrepancies"}
            </p>
            {lines.map((line, i) => (
                <ReconciliationRow
                    key={line.id}
                    form={form}
                    i={i}
                    line={line}
                />
            ))}
        </div>
    );
}

type ReconciliationRowProps = {
    form: ReceivingForm;
    i: number;
    line: ReceiptLineDraft;
};

function ReconciliationRow({ form, i, line }: ReconciliationRowProps) {
    const productNameId = useId();
    const { data: product } = useGetProductQuery(line.productId, {
        skip: !line.productId,
    });
    const actual = getActualQuantity(line);
    const discrepancy = hasDiscrepancy(line);

    return (
        <div
            role="group"
            aria-labelledby={productNameId}
            data-discrepancy={discrepancy ? "true" : undefined}
            className={
                "flex flex-col gap-3 rounded-sm border p-4 " +
                (discrepancy
                    ? "border-warning-foreground bg-warning"
                    : "border-border bg-card")
            }
        >
            <div className="flex flex-wrap items-center gap-2">
                <span id={productNameId} className="font-medium">
                    {product?.name ?? line.productId}
                </span>
                {product && (
                    <span className="font-mono text-xs text-muted-foreground">
                        {formatUnit(product.unit)}
                    </span>
                )}
            </div>

            {(line.batch || line.expiryDate) && (
                <div className="flex flex-wrap gap-4 font-mono text-sm text-muted-foreground">
                    {line.batch && <span>Batch: {line.batch}</span>}
                    {line.expiryDate && <span>Expiry: {line.expiryDate}</span>}
                </div>
            )}

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div className="flex flex-col gap-1.5">
                    <span className="text-sm font-medium leading-none">
                        Expected quantity
                    </span>
                    <div className="flex h-8 items-center gap-1 font-mono text-sm">
                        <span>
                            {line.expectedQuantity !== null
                                ? line.expectedQuantity
                                : "—"}
                        </span>
                        {product && (
                            <span className="text-muted-foreground">
                                {formatUnit(product.unit)}
                            </span>
                        )}
                    </div>
                </div>

                <form.Field name={`lines[${i}].actualQuantity`}>
                    {(field) => (
                        <FormField
                            name={field.name}
                            label="Actual quantity"
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
                                        value={actual ?? ""}
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
            </div>

            {discrepancy &&
                actual !== null &&
                line.expectedQuantity !== null &&
                product && (
                    <p className="font-mono text-sm">
                        {formatDiff(
                            actual - line.expectedQuantity,
                            formatUnit(product.unit),
                        )}
                    </p>
                )}

            {discrepancy && (
                <form.Field name={`lines[${i}].discrepancyNote`}>
                    {(field) => (
                        <FormField
                            name={field.name}
                            label="Discrepancy note"
                            error={firstErrorText(field.state.meta.errors)}
                        >
                            {(fieldProps) => (
                                <textarea
                                    {...fieldProps}
                                    rows={3}
                                    maxLength={500}
                                    className="w-full min-w-0 resize-none rounded-sm border border-input bg-transparent px-2.5 py-1.5 text-sm transition-colors outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 aria-invalid:border-destructive aria-invalid:ring-3 aria-invalid:ring-destructive/20"
                                    value={field.state.value ?? ""}
                                    onChange={(e) =>
                                        field.handleChange(e.target.value)
                                    }
                                    onBlur={field.handleBlur}
                                />
                            )}
                        </FormField>
                    )}
                </form.Field>
            )}
        </div>
    );
}

type ReviewStepProps = {
    suppliers: Supplier[] | undefined;
    supplierId: string;
    invoiceNumber: string;
    date: string;
    lines: ReceiptLineDraft[];
};

function ReviewStep({
    suppliers,
    supplierId,
    invoiceNumber,
    date,
    lines,
}: ReviewStepProps) {
    const supplierName =
        suppliers?.find((s) => s.id === supplierId)?.name ?? supplierId;
    const discrepancyCount = lines.filter(hasDiscrepancy).length;

    return (
        <div className="flex flex-col gap-4">
            <div className="rounded-sm border border-border bg-card p-4">
                <dl className="flex flex-col gap-1.5 text-sm">
                    <div className="flex gap-2">
                        <dt className="text-muted-foreground">Supplier</dt>
                        <dd>{supplierName}</dd>
                    </div>
                    <div className="flex gap-2">
                        <dt className="text-muted-foreground">Invoice</dt>
                        <dd className="font-mono">{invoiceNumber}</dd>
                    </div>
                    <div className="flex gap-2">
                        <dt className="text-muted-foreground">Date</dt>
                        <dd className="font-mono">{date}</dd>
                    </div>
                </dl>
            </div>

            <div className="overflow-x-auto">
                <table className="min-w-[520px] w-full border-collapse text-sm">
                    <thead>
                        <tr className="border-b border-border">
                            <th className="py-2 pr-4 text-left font-mono text-xs text-muted-foreground">
                                Product
                            </th>
                            <th className="whitespace-nowrap py-2 pr-4 text-right font-mono text-xs text-muted-foreground">
                                Expected
                            </th>
                            <th className="whitespace-nowrap py-2 pr-4 text-right font-mono text-xs text-muted-foreground">
                                Actual
                            </th>
                            <th className="whitespace-nowrap py-2 pr-4 text-right font-mono text-xs text-muted-foreground">
                                Diff
                            </th>
                            <th className="py-2 text-left font-mono text-xs text-muted-foreground">
                                Note
                            </th>
                        </tr>
                    </thead>
                    <tbody>
                        {lines.map((line) => (
                            <ReviewLineRow key={line.id} line={line} />
                        ))}
                    </tbody>
                </table>
            </div>

            <p className="text-sm text-muted-foreground">
                {lines.length} {lines.length === 1 ? "line" : "lines"} &middot;{" "}
                {discrepancyCount} with{" "}
                {discrepancyCount === 1 ? "discrepancy" : "discrepancies"}
            </p>
        </div>
    );
}

function ReviewLineRow({ line }: { line: ReceiptLineDraft }) {
    const { data: product } = useGetProductQuery(line.productId, {
        skip: !line.productId,
    });
    const actual = getActualQuantity(line);
    const discrepancy = hasDiscrepancy(line);
    const unit = product ? formatUnit(product.unit) : "";

    return (
        <tr
            data-discrepancy={discrepancy ? "true" : undefined}
            className={
                "border-b border-border last:border-0 " +
                (discrepancy ? "bg-warning" : "")
            }
        >
            <td className="py-2 pr-4 align-top">
                <div className="font-medium">
                    {product?.name ?? line.productId}
                </div>
                {(line.batch || line.expiryDate) && (
                    <div className="mt-0.5 flex flex-wrap gap-3 font-mono text-xs text-muted-foreground">
                        {line.batch && <span>Batch: {line.batch}</span>}
                        {line.expiryDate && (
                            <span>Expiry: {line.expiryDate}</span>
                        )}
                    </div>
                )}
            </td>
            <td className="whitespace-nowrap py-2 pr-4 text-right font-mono align-top">
                {line.expectedQuantity !== null
                    ? `${line.expectedQuantity} ${unit}`
                    : "—"}
            </td>
            <td className="whitespace-nowrap py-2 pr-4 text-right font-mono align-top">
                {actual !== null ? `${actual} ${unit}` : "—"}
            </td>
            <td className="whitespace-nowrap py-2 pr-4 text-right font-mono align-top">
                {discrepancy &&
                actual !== null &&
                line.expectedQuantity !== null
                    ? formatDiff(actual - line.expectedQuantity, unit)
                    : "—"}
            </td>
            <td className="py-2 align-top text-muted-foreground">
                {line.discrepancyNote ?? ""}
            </td>
        </tr>
    );
}
