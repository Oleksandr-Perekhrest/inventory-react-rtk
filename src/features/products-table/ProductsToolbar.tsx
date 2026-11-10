// outsource dependencies
import { cn } from "cn";
import { X } from "lucide-react";
import { useRef, useState, useEffect } from "react";

// local dependencies
import { Input } from "@/components/ui/input";
import type { CatalogSearch } from "../catalog/catalogSearch";
import { useCatalogSearch } from "../catalog/useCatalogSearch";

type StockValue = CatalogSearch["stock"];

const STOCK_OPTIONS: Array<{ label: string; value: StockValue }> = [
    { label: "All", value: undefined },
    { label: "Low", value: "low" },
    { label: "Out", value: "out" },
];

export function ProductsToolbar() {
    const { search, updateSearch } = useCatalogSearch();
    const [localValue, setLocalValue] = useState(search.q ?? "");
    const inputRef = useRef<HTMLInputElement>(null);
    const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    // Keeps the latest search.q available inside the debounced timeout callback,
    // which otherwise closes over a stale value captured 300 ms earlier.
    const searchQRef = useRef(search.q);

    useEffect(() => {
        searchQRef.current = search.q;
    }, [search.q]);

    // Sync local input from URL when no debounce is pending (back/forward, "Clear filters")
    useEffect(() => {
        if (timeoutRef.current === null) {
            setLocalValue(search.q ?? "");
        }
    }, [search.q]);

    // Clear pending timeout on unmount
    useEffect(() => {
        return () => {
            if (timeoutRef.current !== null) {
                clearTimeout(timeoutRef.current);
            }
        };
    }, []);

    function clearSearch(options?: { replace?: boolean }) {
        if (timeoutRef.current !== null) {
            clearTimeout(timeoutRef.current);
            timeoutRef.current = null;
        }
        inputRef.current?.focus();
        if (localValue === "" && search.q === undefined) return;
        setLocalValue("");
        updateSearch({ q: undefined }, options);
    }

    return (
        <div className="flex items-center gap-3">
            <div className="relative min-w-0 flex-1">
                <Input
                    ref={inputRef}
                    type="search"
                    aria-label="Search products"
                    placeholder="Name or SKU"
                    value={localValue}
                    className="pr-8 [&::-webkit-search-cancel-button]:appearance-none"
                    onChange={(e) => {
                        const value = e.target.value;
                        setLocalValue(value);
                        if (timeoutRef.current !== null)
                            clearTimeout(timeoutRef.current);
                        timeoutRef.current = setTimeout(() => {
                            timeoutRef.current = null;
                            const trimmed = value.trim() || undefined;
                            if (trimmed !== searchQRef.current) {
                                updateSearch({ q: trimmed }, { replace: true });
                            }
                        }, 300);
                    }}
                    onKeyDown={(e) => {
                        if (e.key === "Escape") clearSearch({ replace: true });
                    }}
                />
                {localValue && (
                    <button
                        type="button"
                        aria-label="Clear search"
                        onClick={() => clearSearch({ replace: true })}
                        className="absolute top-1/2 right-1.5 flex size-5 -translate-y-1/2 items-center justify-center rounded-sm text-muted-foreground hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
                    >
                        <X aria-hidden="true" className="size-3.5" />
                    </button>
                )}
            </div>
            <div
                role="group"
                aria-label="Stock"
                className="flex shrink-0 items-center gap-1"
            >
                {STOCK_OPTIONS.map(({ label, value }) => (
                    <button
                        key={label}
                        type="button"
                        aria-pressed={search.stock === value}
                        onClick={() => {
                            if (search.stock !== value)
                                updateSearch({ stock: value });
                        }}
                        className={cn(
                            "rounded-sm border px-2.5 py-1 font-mono text-xs font-semibold uppercase tracking-wider transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                            search.stock === value
                                ? "border-primary bg-primary text-primary-foreground"
                                : "border-border bg-background text-muted-foreground hover:bg-muted hover:text-foreground",
                        )}
                    >
                        {label}
                    </button>
                ))}
            </div>
        </div>
    );
}
