// outsource dependencies
import { cn } from "cn";
import type { ReactNode } from "react";
import { Search, ChevronDown, ChevronRight } from "lucide-react";

// local dependencies
import type { CategoryRow } from "./data";
import { Input } from "@/components/ui/input";
import { CATEGORIES, SEARCH_QUERY } from "./data";

function highlightMatch(label: string, query: string): ReactNode {
    if (!query) return label;
    const idx = label.toLowerCase().indexOf(query.toLowerCase());
    if (idx === -1) return label;
    return (
        <>
            {label.slice(0, idx)}
            <mark className="bg-primary text-primary-foreground">
                {label.slice(idx, idx + query.length)}
            </mark>
            {label.slice(idx + query.length)}
        </>
    );
}

function TreeRow({ row, query }: { row: CategoryRow; query: string }) {
    const isLeaf = row.state === "leaf";
    const isExpanded = row.state === "expanded";

    return (
        <li
            role="treeitem"
            aria-level={row.depth + 1}
            aria-selected={row.selected ?? false}
            aria-expanded={!isLeaf ? isExpanded : undefined}
            className={cn(
                "flex h-8 items-center gap-1 rounded-sm pr-1 text-sm",
                row.selected
                    ? "bg-accent text-accent-foreground font-semibold"
                    : "text-foreground",
            )}
            style={{ paddingLeft: `${row.depth * 18 + 4}px` }}
        >
            {isLeaf ? (
                <span className="size-3.5 shrink-0" />
            ) : isExpanded ? (
                <ChevronDown className="size-3.5 shrink-0 text-muted-foreground" />
            ) : (
                <ChevronRight className="size-3.5 shrink-0 text-muted-foreground" />
            )}
            <span className="min-w-0 flex-1 truncate">
                {highlightMatch(row.label, query)}
            </span>
            <span className="shrink-0 font-mono text-xs text-muted-foreground">
                {row.count}
            </span>
        </li>
    );
}

export function CategoryPanel() {
    return (
        <div className="flex w-full shrink-0 flex-col gap-2 rounded-sm border bg-card p-3 md:w-64">
            <span className="font-mono text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                Categories
            </span>
            <div className="relative">
                <label className="sr-only" htmlFor="category-search">
                    Search categories
                </label>
                <Search className="absolute left-2 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
                <Input
                    id="category-search"
                    className="pl-7"
                    defaultValue={SEARCH_QUERY}
                />
            </div>
            <ul role="tree" className="flex flex-col gap-0.5">
                {CATEGORIES.map((cat) => (
                    <TreeRow key={cat.id} row={cat} query={SEARCH_QUERY} />
                ))}
            </ul>
        </div>
    );
}
