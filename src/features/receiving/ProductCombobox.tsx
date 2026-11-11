// outsource dependencies
import { cn } from "cn";
import type { ChangeEvent, KeyboardEvent } from "react";
import { useId, useRef, useState, useEffect, forwardRef } from "react";

// local dependencies
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
    useGetProductQuery,
    useGetProductsQuery,
} from "@/api/endpoints/products";

type Props = {
    id: string;
    value: string;
    onChange: (productId: string) => void;
    onBlur: () => void;
    "aria-invalid"?: true;
    "aria-describedby"?: string;
};

export const ProductCombobox = forwardRef<HTMLInputElement, Props>(
    function ProductCombobox(
        {
            id,
            value,
            onChange,
            onBlur,
            "aria-invalid": ariaInvalid,
            "aria-describedby": ariaDescribedby,
        },
        forwardedRef,
    ) {
        const listboxId = useId();
        const internalRef = useRef<HTMLInputElement>(null);
        const listRef = useRef<HTMLUListElement>(null);
        const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

        const [open, setOpen] = useState(false);
        const [inputText, setInputText] = useState("");
        const [debouncedQuery, setDebouncedQuery] = useState("");
        const [activeIndex, setActiveIndex] = useState(0);

        const { data: selectedProduct } = useGetProductQuery(value, {
            skip: !value,
        });
        const {
            data: productsData,
            isFetching,
            isError,
            refetch,
        } = useGetProductsQuery(
            { q: debouncedQuery || undefined, pageSize: 20 },
            { skip: !open },
        );
        const products = productsData?.items ?? [];

        // Sync input text to selected product name when list is closed
        useEffect(() => {
            if (!open) {
                setInputText(selectedProduct?.name ?? "");
            }
        }, [open, selectedProduct?.name]);

        // Scroll active option into view
        useEffect(() => {
            if (!listRef.current || !open) return;
            const active = listRef.current.querySelector(
                '[aria-selected="true"]',
            );
            active?.scrollIntoView({ block: "nearest" });
        }, [activeIndex, open]);

        function setRef(el: HTMLInputElement | null) {
            (
                internalRef as React.MutableRefObject<HTMLInputElement | null>
            ).current = el;
            if (typeof forwardedRef === "function") {
                forwardedRef(el);
            } else if (forwardedRef) {
                (
                    forwardedRef as React.MutableRefObject<HTMLInputElement | null>
                ).current = el;
            }
        }

        function handleInputChange(e: ChangeEvent<HTMLInputElement>) {
            const text = e.target.value;
            setInputText(text);
            setOpen(true);
            setActiveIndex(0);
            if (debounceRef.current) clearTimeout(debounceRef.current);
            debounceRef.current = setTimeout(() => {
                setDebouncedQuery(text);
            }, 250);
        }

        function handleFocus() {
            setOpen(true);
            setDebouncedQuery(inputText);
        }

        function handleBlur() {
            setTimeout(() => {
                setOpen(false);
                onBlur();
            }, 150);
        }

        function selectProduct(productId: string, productName: string) {
            onChange(productId);
            setInputText(productName);
            setOpen(false);
        }

        function handleKeyDown(e: KeyboardEvent<HTMLInputElement>) {
            if (!open) {
                if (e.key === "ArrowDown" || e.key === "ArrowUp") {
                    e.preventDefault();
                    setOpen(true);
                    setDebouncedQuery(inputText);
                }
                return;
            }
            if (e.key === "ArrowDown") {
                e.preventDefault();
                setActiveIndex((i) => Math.min(i + 1, products.length - 1));
            } else if (e.key === "ArrowUp") {
                e.preventDefault();
                setActiveIndex((i) => Math.max(i - 1, 0));
            } else if (e.key === "Enter") {
                e.preventDefault();
                const product = products[activeIndex];
                if (product) selectProduct(product.id, product.name);
            } else if (e.key === "Escape") {
                e.preventDefault();
                setOpen(false);
                setInputText(selectedProduct?.name ?? "");
            }
        }

        const activeOptionId =
            open && products[activeIndex] !== undefined
                ? `${listboxId}-option-${activeIndex}`
                : undefined;

        return (
            <div className="relative">
                <Input
                    ref={setRef}
                    id={id}
                    role="combobox"
                    aria-expanded={open}
                    aria-controls={open ? listboxId : undefined}
                    aria-activedescendant={activeOptionId}
                    aria-autocomplete="list"
                    aria-invalid={ariaInvalid}
                    aria-describedby={ariaDescribedby}
                    value={inputText}
                    placeholder="Search products…"
                    autoComplete="off"
                    onChange={handleInputChange}
                    onFocus={handleFocus}
                    onBlur={handleBlur}
                    onKeyDown={handleKeyDown}
                />
                {open && (
                    <div
                        className="absolute left-0 right-0 top-full z-50 mt-1 overflow-y-auto rounded-sm border border-border bg-background shadow-md"
                        style={{ maxHeight: "16rem" }}
                        onMouseDown={(e) => e.preventDefault()}
                    >
                        {isFetching && products.length === 0 ? (
                            <p className="px-3 py-2 text-sm text-muted-foreground">
                                Loading…
                            </p>
                        ) : isError ? (
                            <div className="flex items-center gap-2 px-3 py-2 text-sm text-destructive">
                                <span>Failed to load products</span>
                                <Button
                                    type="button"
                                    size="xs"
                                    variant="outline"
                                    onClick={() => void refetch()}
                                >
                                    Retry
                                </Button>
                            </div>
                        ) : products.length === 0 ? (
                            <p className="px-3 py-2 text-sm text-muted-foreground">
                                No products match
                            </p>
                        ) : (
                            <ul
                                ref={listRef}
                                id={listboxId}
                                role="listbox"
                                aria-label="Products"
                                className="py-1"
                            >
                                {products.map((product, i) => (
                                    <li
                                        key={product.id}
                                        id={`${listboxId}-option-${i}`}
                                        role="option"
                                        aria-selected={i === activeIndex}
                                        data-active={
                                            i === activeIndex
                                                ? "true"
                                                : undefined
                                        }
                                        className={cn(
                                            "flex cursor-pointer items-center gap-2 px-3 py-1.5 text-sm",
                                            i === activeIndex &&
                                                "bg-accent text-accent-foreground",
                                        )}
                                        onClick={() =>
                                            selectProduct(
                                                product.id,
                                                product.name,
                                            )
                                        }
                                    >
                                        <span className="min-w-0 flex-1 truncate font-medium">
                                            {product.name}
                                        </span>
                                        <span className="shrink-0 font-mono text-xs text-muted-foreground">
                                            {product.sku}
                                        </span>
                                        <span className="shrink-0 font-mono text-xs text-muted-foreground">
                                            {product.unit}
                                        </span>
                                        {product.perishable && (
                                            <span className="shrink-0 rounded-sm bg-warning px-1.5 py-0.5 font-mono text-xs text-warning-foreground">
                                                Perishable
                                            </span>
                                        )}
                                    </li>
                                ))}
                            </ul>
                        )}
                    </div>
                )}
            </div>
        );
    },
);
