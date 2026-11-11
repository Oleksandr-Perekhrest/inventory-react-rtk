// outsource dependencies
import { cn } from "cn";
import { useId, useRef, useMemo, useState, useEffect } from "react";

// local dependencies
import type { Category } from "@/domain";
import { Input } from "@/components/ui/input";
import { filterMoveTargets, type MoveTargetOption } from "./moveTargets";
import {
    Dialog,
    DialogTitle,
    DialogHeader,
    DialogContent,
    DialogDescription,
} from "@/components/ui/dialog";

type Props = {
    open: boolean;
    onOpenChange(open: boolean): void;
    title: string;
    description: string;
    options: MoveTargetOption[];
    onSelect(id: Category["id"] | null): void;
};

export function MoveToCategoryDialog({
    open,
    onOpenChange,
    title,
    description,
    options,
    onSelect,
}: Props) {
    const listboxId = useId();
    const listRef = useRef<HTMLUListElement>(null);
    const [prevOpen, setPrevOpen] = useState(false);
    const [query, setQuery] = useState("");
    const [activeIndex, setActiveIndex] = useState(0);

    // Reset query and active option each time the dialog opens (derived-state-during-render pattern).
    if (open !== prevOpen) {
        setPrevOpen(open);
        if (open) {
            setQuery("");
            const first = options.findIndex((opt) => !opt.disabled);
            setActiveIndex(first >= 0 ? first : 0);
        }
    }

    const filtered = useMemo(
        () => filterMoveTargets(options, query),
        [options, query],
    );

    useEffect(() => {
        if (!listRef.current) return;
        const active = listRef.current.querySelector('[data-active="true"]');
        active?.scrollIntoView({ block: "nearest" });
    }, [activeIndex]);

    function handleQueryChange(e: React.ChangeEvent<HTMLInputElement>) {
        const newQuery = e.target.value;
        setQuery(newQuery);
        const newFiltered = filterMoveTargets(options, newQuery);
        const first = newFiltered.findIndex((opt) => !opt.disabled);
        setActiveIndex(first >= 0 ? first : 0);
    }

    function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
        if (e.key === "ArrowDown") {
            e.preventDefault();
            let next = activeIndex + 1;
            while (next < filtered.length && filtered[next]?.disabled) next++;
            if (next < filtered.length) setActiveIndex(next);
        } else if (e.key === "ArrowUp") {
            e.preventDefault();
            let prev = activeIndex - 1;
            while (prev >= 0 && filtered[prev]?.disabled) prev--;
            if (prev >= 0) setActiveIndex(prev);
        } else if (e.key === "Enter") {
            e.preventDefault();
            const active = filtered[activeIndex];
            if (active && !active.disabled) {
                onSelect(active.id);
                onOpenChange(false);
            }
        }
    }

    const activeOptionId =
        filtered[activeIndex] !== undefined
            ? `${listboxId}-option-${activeIndex}`
            : undefined;

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>{title}</DialogTitle>
                    <DialogDescription>{description}</DialogDescription>
                </DialogHeader>
                <Input
                    role="combobox"
                    aria-expanded={true}
                    aria-controls={listboxId}
                    aria-activedescendant={activeOptionId}
                    aria-autocomplete="list"
                    placeholder="Search categories"
                    value={query}
                    autoFocus
                    onChange={handleQueryChange}
                    onKeyDown={handleKeyDown}
                />
                {filtered.length === 0 ? (
                    <p
                        role="status"
                        className="py-4 text-center text-sm text-muted-foreground"
                    >
                        No categories match
                    </p>
                ) : (
                    <ul
                        ref={listRef}
                        id={listboxId}
                        role="listbox"
                        className="max-h-64 overflow-y-auto"
                    >
                        {filtered.map((opt, i) => (
                            <li
                                key={opt.id ?? "top-level"}
                                id={`${listboxId}-option-${i}`}
                                role="option"
                                aria-selected={i === activeIndex}
                                aria-disabled={opt.disabled}
                                data-active={
                                    i === activeIndex ? "true" : undefined
                                }
                                style={{
                                    paddingLeft: `calc(${opt.depth} * 1rem + 0.5rem)`,
                                }}
                                className={cn(
                                    "flex cursor-pointer items-center gap-1 rounded-sm py-1.5 pr-2 text-sm",
                                    i === activeIndex &&
                                        !opt.disabled &&
                                        "bg-accent text-accent-foreground",
                                    opt.disabled &&
                                        "cursor-not-allowed opacity-50",
                                )}
                                onClick={() => {
                                    if (!opt.disabled) {
                                        onSelect(opt.id);
                                        onOpenChange(false);
                                    }
                                }}
                            >
                                {opt.name}
                                {opt.current && (
                                    <span className="ml-1 text-muted-foreground">
                                        (current)
                                    </span>
                                )}
                            </li>
                        ))}
                    </ul>
                )}
            </DialogContent>
        </Dialog>
    );
}
