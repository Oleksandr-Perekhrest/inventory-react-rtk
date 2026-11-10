// outsource dependencies
import { X } from "lucide-react";
import { useRef, useMemo, useState, useEffect, useCallback } from "react";

// local dependencies
import { TreeNode } from "./TreeNode";
import { getKeyAction } from "./navigation";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { selectChildrenIndex } from "./selectors";
import { getErrorMessage } from "../../api/errors";
import { Skeleton } from "@/components/ui/skeleton";
import { useAppDispatch, useAppSelector } from "../../store/hooks";
import { useGetCategoriesQuery } from "../../api/endpoints/categories";
import { INACTIVE_SEARCH, TreeSearchContext } from "./TreeSearchContext";
import { ROOT, findMatches, getVisibleOrder, collectAncestors } from "./tree";
import {
    useSelectCategory,
    useSelectedCategoryId,
} from "../catalog/useCatalogSearch";
import {
    toggle,
    expandMany,
    setFocused,
    selectFocusedId,
} from "./categoryTreeSlice";

const labelId = "categories-tree-label";

export function CategoryTree() {
    const { data, isLoading, isError, error, refetch } =
        useGetCategoriesQuery();
    const [query, setQuery] = useState("");
    const trimmedQuery = query.trim();
    const isSearchActive = trimmedQuery !== "";
    const dispatch = useAppDispatch();
    const focusedId = useAppSelector(selectFocusedId);
    const selectCategory = useSelectCategory();
    const selectedId = useSelectedCategoryId();
    const selectedEntityExists = !!selectedId && !!data?.entities[selectedId];
    const expanded = useAppSelector((state) => state.categoryTree.expanded);
    const treeRef = useRef<HTMLUListElement>(null);
    const inputRef = useRef<HTMLInputElement>(null);

    const searchContext = useMemo(() => {
        if (!trimmedQuery || !data) return INACTIVE_SEARCH;
        const matches = findMatches(data, trimmedQuery);
        const ancestors = collectAncestors(data, matches);
        const visible = new Set([...matches, ...ancestors]);
        return { query: trimmedQuery, matches, visible };
    }, [data, trimmedQuery]);

    const visibleOrder = useMemo(() => {
        if (!data) return [];
        const index = selectChildrenIndex(data);
        const isExpanded = (id: string) => id in expanded;
        return getVisibleOrder(
            index,
            isExpanded,
            isSearchActive ? searchContext.visible : undefined,
        );
    }, [data, expanded, isSearchActive, searchContext.visible]);

    const names = useMemo(() => {
        const map = new Map<string, string>();
        if (!data) return map;
        for (const id of data.ids) {
            const entity = data.entities[id];
            if (entity) map.set(id, entity.name);
        }
        return map;
    }, [data]);

    useEffect(() => {
        if (visibleOrder.length === 0) {
            if (focusedId !== null) dispatch(setFocused(null));
            return;
        }
        const inOrder =
            focusedId !== null && visibleOrder.some((n) => n.id === focusedId);
        if (!inOrder) {
            dispatch(setFocused(visibleOrder[0].id));
        }
    }, [visibleOrder, focusedId, dispatch]);

    useEffect(() => {
        if (isSearchActive || !selectedId || !selectedEntityExists) return;
        const ancestors = collectAncestors(data!, new Set([selectedId]));
        dispatch(expandMany([...ancestors]));
        dispatch(setFocused(selectedId));
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [selectedId, selectedEntityExists, isSearchActive, dispatch]);

    const handleTreeKeyDown = useCallback(
        (e: React.KeyboardEvent) => {
            const action = getKeyAction(
                visibleOrder,
                focusedId,
                e.key,
                isSearchActive,
                names,
            );
            if (action.type === "none") return;
            e.preventDefault();
            if (action.type === "focus") {
                dispatch(setFocused(action.id));
            } else if (action.type === "toggle") {
                dispatch(toggle(action.id));
            } else {
                selectCategory(action.id);
            }
        },
        [
            visibleOrder,
            focusedId,
            isSearchActive,
            names,
            dispatch,
            selectCategory,
        ],
    );

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
            <div className="relative">
                <Input
                    ref={inputRef}
                    type="search"
                    aria-label="Search categories"
                    placeholder="Search categories"
                    value={query}
                    className="pr-8 [&::-webkit-search-cancel-button]:appearance-none"
                    onChange={(e) => setQuery(e.target.value)}
                    onKeyDown={(e) => {
                        if (e.key === "Escape") setQuery("");
                        if (e.key === "ArrowDown") {
                            e.preventDefault();
                            treeRef.current
                                ?.querySelector<HTMLElement>('[tabindex="0"]')
                                ?.focus();
                        }
                    }}
                />
                {query && (
                    <button
                        type="button"
                        aria-label="Clear search"
                        onClick={() => {
                            setQuery("");
                            inputRef.current?.focus();
                        }}
                        className="absolute top-1/2 right-1.5 flex size-5 -translate-y-1/2 items-center justify-center rounded-sm text-muted-foreground hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
                    >
                        <X aria-hidden="true" className="size-3.5" />
                    </button>
                )}
            </div>
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
                            ref={treeRef}
                            role="tree"
                            aria-labelledby={labelId}
                            className="flex flex-col gap-0.5"
                            onKeyDown={handleTreeKeyDown}
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
