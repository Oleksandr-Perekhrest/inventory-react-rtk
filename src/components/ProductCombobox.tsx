// outsource dependencies
import { cn } from "cn";
import { useId, useRef, useState, useEffect } from "react";
import type { Ref, ChangeEvent, KeyboardEvent } from "react";

// local dependencies
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { formatUnit, type Product } from "@/domain";
import {
    useGetProductQuery,
    useGetProductsQuery,
} from "@/api/endpoints/products";

type Props = {
    id: string;
    value: string;
    onChange: (product: Product) => void;
    onBlur?: () => void;
    "aria-invalid"?: true;
    "aria-describedby"?: string;
    ref?: Ref<HTMLInputElement>;
};

export function ProductCombobox({
    id,
    value,
    onChange,
    onBlur,
    ref,
    "aria-invalid": ariaInvalid,
    "aria-describedby": ariaDescribedby,
}: Props) {
    const listboxId = useId();
    const listRef = useRef<HTMLUListElement>(null);
    const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    const [open, setOpen] = useState(false);
    const [inputText, setInputText] = useState("");
    const [stagedName, setStagedName] = useState("");
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

    // When closed: show name from RTK Query cache, falling back to the last
    // explicitly selected name (covers the brief window while query is in-flight)
    const closedText = value ? (selectedProduct?.name ?? stagedName) : "";
    const displayValue = open ? inputText : closedText;

    // Scroll active option into view
    useEffect(() => {
        if (!listRef.current || !open) return;
        const active = listRef.current.querySelector('[aria-selected="true"]');
        active?.scrollIntoView({ block: "nearest" });
    }, [activeIndex, open]);

    // Clear pending debounce on unmount
    useEffect(() => {
        return () => {
            if (debounceRef.current) clearTimeout(debounceRef.current);
        };
    }, []);

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
        setInputText(closedText);
        setDebouncedQuery(closedText);
    }

    function handleBlur() {
        setOpen(false);
        onBlur?.();
    }

    function selectProduct(product: Product) {
        onChange(product);
        setStagedName(product.name);
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
            setActiveIndex((i) =>
                Math.max(0, Math.min(i + 1, products.length - 1)),
            );
        } else if (e.key === "ArrowUp") {
            e.preventDefault();
            setActiveIndex((i) => Math.max(i - 1, 0));
        } else if (e.key === "Enter") {
            e.preventDefault();
            const product = products[activeIndex];
            if (product) selectProduct(product);
        } else if (e.key === "Escape") {
            e.preventDefault();
            setOpen(false);
        }
    }

    const activeOptionId =
        open && products[activeIndex] !== undefined
            ? `${listboxId}-option-${activeIndex}`
            : undefined;

    return (
        <div className="relative">
            <Input
                ref={ref}
                id={id}
                role="combobox"
                aria-expanded={open}
                aria-controls={open ? listboxId : undefined}
                aria-activedescendant={activeOptionId}
                aria-autocomplete="list"
                aria-invalid={ariaInvalid}
                aria-describedby={ariaDescribedby}
                value={displayValue}
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
                                        i === activeIndex ? "true" : undefined
                                    }
                                    className={cn(
                                        "flex cursor-pointer items-center gap-2 px-3 py-1.5 text-sm",
                                        i === activeIndex &&
                                            "bg-accent text-accent-foreground",
                                    )}
                                    onClick={() => selectProduct(product)}
                                >
                                    <span className="min-w-0 flex-1 truncate font-medium">
                                        {product.name}
                                    </span>
                                    <span className="shrink-0 font-mono text-xs text-muted-foreground">
                                        {product.sku}
                                    </span>
                                    <span className="shrink-0 font-mono text-xs text-muted-foreground">
                                        {formatUnit(product.unit)}
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
}
