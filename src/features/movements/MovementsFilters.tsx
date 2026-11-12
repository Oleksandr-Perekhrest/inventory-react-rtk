// outsource dependencies
import { cn } from "cn";
import { X } from "lucide-react";
import { useId, useRef } from "react";

// local dependencies
import { presetRange } from "./helpers";
import type { MovementType } from "@/domain";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { hasActiveFilters } from "./journalSearch";
import { useJournalSearch } from "./useJournalSearch";
import { ProductCombobox } from "@/components/ProductCombobox";

type TypeOption = { label: string; value: MovementType | undefined };

const TYPE_OPTIONS: TypeOption[] = [
    { label: "All", value: undefined },
    { label: "Receipt", value: "receipt" },
    { label: "Shipment", value: "shipment" },
    { label: "Write-off", value: "write-off" },
    { label: "Adjustment", value: "adjustment" },
];

const PRESET_OPTIONS = [
    { label: "Last 7 days", days: 7 },
    { label: "Last 30 days", days: 30 },
    { label: "Last 90 days", days: 90 },
];

const LABEL_CLASS =
    "font-mono text-xs font-semibold uppercase tracking-wider text-muted-foreground";

const BUTTON_BASE =
    "rounded-sm border px-2.5 py-1 font-mono text-xs font-semibold uppercase tracking-wider transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring";
const BUTTON_ACTIVE = "border-primary bg-primary text-primary-foreground";
const BUTTON_INACTIVE =
    "border-border bg-background text-muted-foreground hover:bg-muted hover:text-foreground";

export function MovementsFilters() {
    const { search, updateSearch } = useJournalSearch();
    const today = new Date();
    const productComboboxId = useId();
    const comboboxInputRef = useRef<HTMLInputElement>(null);

    function clearFilters() {
        updateSearch({
            from: undefined,
            to: undefined,
            type: undefined,
            productId: undefined,
        });
    }

    return (
        <div className="flex flex-wrap items-end gap-3">
            <div className="flex flex-col gap-1">
                <label htmlFor="journal-from" className={LABEL_CLASS}>
                    From
                </label>
                <Input
                    id="journal-from"
                    type="date"
                    value={search.from ?? ""}
                    max={search.to}
                    className="w-36"
                    onChange={(e) =>
                        updateSearch(
                            { from: e.target.value || undefined },
                            { replace: true },
                        )
                    }
                />
            </div>
            <div className="flex flex-col gap-1">
                <label htmlFor="journal-to" className={LABEL_CLASS}>
                    To
                </label>
                <Input
                    id="journal-to"
                    type="date"
                    value={search.to ?? ""}
                    min={search.from}
                    className="w-36"
                    onChange={(e) =>
                        updateSearch(
                            { to: e.target.value || undefined },
                            { replace: true },
                        )
                    }
                />
            </div>
            <div
                role="group"
                aria-label="Date presets"
                className="flex shrink-0 items-center gap-1"
            >
                {PRESET_OPTIONS.map(({ label, days }) => {
                    const range = presetRange(days, today);
                    const isPressed =
                        search.from === range.from && search.to === range.to;
                    return (
                        <button
                            key={label}
                            type="button"
                            aria-pressed={isPressed}
                            onClick={() => {
                                if (!isPressed) updateSearch(range);
                            }}
                            className={cn(
                                BUTTON_BASE,
                                isPressed ? BUTTON_ACTIVE : BUTTON_INACTIVE,
                            )}
                        >
                            {label}
                        </button>
                    );
                })}
            </div>
            <div
                role="group"
                aria-label="Type"
                className="flex shrink-0 items-center gap-1"
            >
                {TYPE_OPTIONS.map(({ label, value }) => (
                    <button
                        key={label}
                        type="button"
                        aria-pressed={search.type === value}
                        onClick={() => {
                            if (search.type !== value)
                                updateSearch({ type: value });
                        }}
                        className={cn(
                            BUTTON_BASE,
                            search.type === value
                                ? BUTTON_ACTIVE
                                : BUTTON_INACTIVE,
                        )}
                    >
                        {label}
                    </button>
                ))}
            </div>
            <div className="flex flex-col gap-1">
                <label htmlFor={productComboboxId} className={LABEL_CLASS}>
                    Product
                </label>
                <div className="flex items-center gap-1">
                    <ProductCombobox
                        id={productComboboxId}
                        ref={comboboxInputRef}
                        value={search.productId ?? ""}
                        onChange={(product) =>
                            updateSearch({ productId: product.id })
                        }
                    />
                    {search.productId && (
                        <button
                            type="button"
                            aria-label="Clear product filter"
                            onClick={() => {
                                updateSearch({ productId: undefined });
                                comboboxInputRef.current?.focus();
                            }}
                            className="flex size-5 items-center justify-center rounded-sm text-muted-foreground hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
                        >
                            <X aria-hidden="true" className="size-3.5" />
                        </button>
                    )}
                </div>
            </div>
            {hasActiveFilters(search) && (
                <Button variant="outline" size="sm" onClick={clearFilters}>
                    Clear filters
                </Button>
            )}
        </div>
    );
}
