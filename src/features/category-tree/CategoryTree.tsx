// outsource dependencies
import { X } from "lucide-react";
import { useRef, useMemo, useState, useEffect, useCallback } from "react";

// local dependencies
import { TreeNode } from "./TreeNode";
import { getKeyAction } from "./navigation";
import { Input } from "@/components/ui/input";
import { getErrorMessage } from "@/api/errors";
import { Button } from "@/components/ui/button";
import { selectChildrenIndex } from "./selectors";
import { Skeleton } from "@/components/ui/skeleton";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { useGetCategoriesQuery } from "@/api/endpoints/categories";
import { ROOT, findMatches, getVisibleOrder, collectAncestors } from "./tree";
import {
    toggle,
    expandMany,
    setFocused,
    selectFocusedId,
} from "./categoryTreeSlice";
import {
    useSelectCategory,
    useSelectedCategoryId,
} from "@/features/catalog/useCatalogSearch";
import {
    INACTIVE_SEARCH,
    TreeSearchContext,
    TreeSelectContext,
} from "./TreeSearchContext";

const labelId = "categories-tree-label";

export function CategoryTree({
    onCategorySelected,
}: {
    onCategorySelected?: (id: string) => void;
}) {
    const { data, isLoading, isError, error, refetch } =
        useGetCategoriesQuery();
    const [query, setQuery] = useState("");
    const trimmedQuery = query.trim();
    const isSearchActive = trimmedQuery !== "";
    const dispatch = useAppDispatch();
    const focusedId = useAppSelector(selectFocusedId);
    const selectCategory = useSelectCategory();
    const selectedId = useSelectedCategoryId();
    // Ancestors as a primitive key: effect re-runs only when the path changes,
    // not on every refetch. null = selected id is not in the data (yet).
    const selectedAncestorsKey = useMemo(() => {
        if (!data || !selectedId || !data.entities[selectedId]) return null;
        return [...collectAncestors(data, new Set([selectedId]))].join(",");
    }, [data, selectedId]);
    const expanded = useAppSelector((state) => state.categoryTree.expanded);
    const treeRef = useRef<HTMLUListElement>(null);
    const inputRef = useRef<HTMLInputElement>(null);
    const dataRef = useRef(data);
    useEffect(() => {
        dataRef.current = data;
    }, [data]);

    const handleSelect = useCallback(
        (id: string) => {
            if (isSearchActive) {
                const d = dataRef.current;
                if (d) {
                    dispatch(
                        expandMany([...collectAncestors(d, new Set([id]))]),
                    );
                }
                setQuery("");
            }
            selectCategory(id);
            onCategorySelected?.(id);
        },
        [isSearchActive, dispatch, selectCategory, onCategorySelected],
    );

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
        if (isSearchActive || !selectedId || selectedAncestorsKey === null) {
            return;
        }
        if (selectedAncestorsKey) {
            dispatch(expandMany(selectedAncestorsKey.split(",")));
        }
        dispatch(setFocused(selectedId));
    }, [selectedId, selectedAncestorsKey, isSearchActive, dispatch]);

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
                handleSelect(action.id);
            }
        },
        [
            visibleOrder,
            focusedId,
            isSearchActive,
            names,
            dispatch,
            handleSelect,
        ],
    );

    const rootChildIds = data
        ? (selectChildrenIndex(data).get(ROOT) ?? [])
        : [];
    const visibleRootIds = isSearchActive
        ? rootChildIds.filter((id) => searchContext.visible.has(id))
        : rootChildIds;

    return (
        <div className="flex w-full shrink-0 flex-col gap-2 self-start rounded-sm border bg-card p-3">
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
                            if (visibleOrder.length === 0) return;
                            const targetId = isSearchActive
                                ? (visibleOrder.find((n) =>
                                      searchContext.matches.has(n.id),
                                  )?.id ?? visibleOrder[0].id)
                                : visibleOrder[0].id;
                            dispatch(setFocused(targetId));
                            treeRef.current
                                ?.querySelector<HTMLElement>(
                                    `[data-category-id="${targetId}"]`,
                                )
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
                <TreeSelectContext.Provider value={handleSelect}>
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
                </TreeSelectContext.Provider>
            )}
        </div>
    );
}
