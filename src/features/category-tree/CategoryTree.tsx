// outsource dependencies
import { useMemo, useState } from "react";

// local dependencies
import { TreeNode } from "./TreeNode";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { selectChildrenIndex } from "./selectors";
import { getErrorMessage } from "../../api/errors";
import { Skeleton } from "@/components/ui/skeleton";
import { ROOT, findMatches, collectAncestors } from "./tree";
import { useGetCategoriesQuery } from "../../api/endpoints/categories";
import { INACTIVE_SEARCH, TreeSearchContext } from "./TreeSearchContext";

const labelId = "categories-tree-label";

export function CategoryTree() {
    const { data, isLoading, isError, error, refetch } =
        useGetCategoriesQuery();
    const [query, setQuery] = useState("");
    const trimmedQuery = query.trim();
    const isSearchActive = trimmedQuery !== "";

    const searchContext = useMemo(() => {
        if (!trimmedQuery || !data) return INACTIVE_SEARCH;
        const matches = findMatches(data, trimmedQuery);
        const ancestors = collectAncestors(data, matches);
        const visible = new Set([...matches, ...ancestors]);
        return { query: trimmedQuery, matches, visible };
    }, [data, trimmedQuery]);

    const rootChildIds = data
        ? (selectChildrenIndex(data).get(ROOT) ?? [])
        : [];

    const visibleRootIds = isSearchActive
        ? rootChildIds.filter((id) => searchContext.visible.has(id))
        : rootChildIds;

    return (
        <div className="flex w-full shrink-0 flex-col gap-2 self-start rounded-sm border bg-card p-3 md:w-64">
            <span
                id={labelId}
                className="font-mono text-[11px] font-semibold uppercase tracking-wider text-muted-foreground"
            >
                Categories
            </span>
            <Input
                type="search"
                aria-label="Search categories"
                placeholder="Search categories"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={(e) => {
                    if (e.key === "Escape") setQuery("");
                }}
            />
            <div role="status" aria-live="polite" className="sr-only">
                {isSearchActive
                    ? `${searchContext.matches.size} ${searchContext.matches.size === 1 ? "category" : "categories"} found`
                    : ""}
            </div>
            {isLoading && (
                <div className="flex flex-col gap-1">
                    {Array.from({ length: 5 }).map((_, i) => (
                        <Skeleton key={i} className="h-8 w-full rounded-sm" />
                    ))}
                </div>
            )}
            {isError && (
                <div className="flex flex-col gap-2 text-sm text-destructive">
                    <span>{getErrorMessage(error)}</span>
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={() => void refetch()}
                    >
                        Retry
                    </Button>
                </div>
            )}
            {data && (
                <TreeSearchContext.Provider value={searchContext}>
                    {isSearchActive && searchContext.matches.size === 0 ? (
                        <p className="text-sm text-muted-foreground">
                            {`No categories match "${trimmedQuery}"`}
                        </p>
                    ) : (
                        <ul
                            role="tree"
                            aria-labelledby={labelId}
                            className="flex flex-col gap-0.5"
                        >
                            {visibleRootIds.map((id) => (
                                <TreeNode key={id} id={id} level={1} />
                            ))}
                        </ul>
                    )}
                </TreeSearchContext.Provider>
            )}
        </div>
    );
}
