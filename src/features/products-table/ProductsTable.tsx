// outsource dependencies
import { cn } from "cn";
import { useTable } from "@tanstack/react-table";
import { useRef, useMemo, useState } from "react";
import { ArrowUp, ArrowDown, ArrowUpDown } from "lucide-react";

// local dependencies
import type { Product } from "@/domain";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { ProductMoveContext } from "./ProductMoveContext";
import { DraggableProductRow } from "./DraggableProductRow";
import { PRODUCTS_HEADING_ID } from "./ProductsTableHeader";
import { getErrorStatus, getErrorMessage } from "@/api/errors";
import { matchesCategoryFilter } from "@/api/productSelection";
import { useMoveCommands } from "@/features/catalog/moveCommands";
import { useGetCategoriesQuery } from "@/api/endpoints/categories";
import { columns, features, RIGHT_ALIGNED_COLUMNS } from "./columns";
import { buildMoveTargets } from "@/features/category-tree/moveTargets";
import { MoveToCategoryDialog } from "@/features/category-tree/MoveToCategoryDialog";
import {
    toProductsParams,
    type CatalogSearch,
} from "@/features/catalog/catalogSearch";
import {
    useCatalogSearch,
    useSelectCategory,
    useCatalogProducts,
} from "@/features/catalog/useCatalogSearch";
import {
    Table,
    TableRow,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
} from "@/components/ui/table";

const HEADER_CLASS =
    "h-9 bg-muted px-3 font-mono text-[11px] font-semibold uppercase tracking-wider text-muted-foreground";
const EMPTY_PRODUCTS: Product[] = [];

function isSortKey(id: string): id is CatalogSearch["sort"] {
    return id === "name" || id === "sku" || id === "quantity" || id === "price";
}

export function ProductsTable() {
    const { search, updateSearch } = useCatalogSearch();
    const { data, isLoading, isFetching, isError, error, refetch } =
        useCatalogProducts();
    const selectCategory = useSelectCategory();
    const { moveProduct } = useMoveCommands();
    const { data: categoriesData } = useGetCategoriesQuery(undefined);

    const [moveProductState, setMoveProductState] = useState<Product | null>(
        null,
    );
    const moveTriggerRef = useRef<HTMLElement | null>(null);
    const moveTargetCategoryRef = useRef<string | null>(null);

    const sorting = useMemo(
        () => [{ id: search.sort, desc: search.order === "desc" }],
        [search.sort, search.order],
    );

    const moveOptions = useMemo(
        () =>
            moveProductState !== null && categoriesData !== undefined
                ? buildMoveTargets(categoriesData, {
                      kind: "product",
                      categoryId: moveProductState.categoryId,
                  })
                : [],
        [moveProductState, categoriesData],
    );

    function getReturnFocusTarget(): HTMLElement | null {
        const trigger = moveTriggerRef.current;
        if (trigger && trigger.isConnected) {
            const targetId = moveTargetCategoryRef.current;
            if (targetId === null || categoriesData === undefined)
                return trigger;
            const staysInView = matchesCategoryFilter(
                targetId,
                toProductsParams(search),
                categoriesData,
            );
            if (staysInView) return trigger;
        }
        return document.getElementById(PRODUCTS_HEADING_ID);
    }

    const moveContextValue = useMemo(
        () => ({
            requestMove(product: Product, trigger: HTMLElement) {
                moveTriggerRef.current = trigger;
                moveTargetCategoryRef.current = null;
                setMoveProductState(product);
            },
        }),
        [],
    );

    const table = useTable({
        features,
        columns,
        data: data?.items ?? EMPTY_PRODUCTS,
        state: { sorting },
        onSortingChange: (updaterOrValue) => {
            const newSorting =
                typeof updaterOrValue === "function"
                    ? updaterOrValue(sorting)
                    : updaterOrValue;
            const first = newSorting[0];
            if (first && isSortKey(first.id)) {
                updateSearch({
                    sort: first.id,
                    order: first.desc ? "desc" : "asc",
                });
            }
        },
        manualSorting: true,
        enableSortingRemoval: false,
        sortDescFirst: false,
    });

    if (isError && !data) {
        if (getErrorStatus(error) === 404 && search.categoryId !== undefined) {
            return (
                <div className="flex flex-1 min-h-0 flex-col items-center justify-center gap-2 rounded-sm border bg-card p-8 text-sm text-muted-foreground">
                    <span>{"This category doesn't exist"}</span>
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={() => selectCategory(undefined)}
                    >
                        Show all products
                    </Button>
                </div>
            );
        }
        return (
            <div
                role="alert"
                className="flex flex-1 min-h-0 flex-col gap-2 rounded-sm border bg-card p-4 text-sm text-destructive"
            >
                <span>{getErrorMessage(error)}</span>
                <Button
                    variant="outline"
                    size="sm"
                    className="self-start"
                    onClick={() => void refetch()}
                >
                    Retry
                </Button>
            </div>
        );
    }

    return (
        <ProductMoveContext.Provider value={moveContextValue}>
            <div className="flex flex-1 min-h-0 flex-col gap-2">
                {isError && data && (
                    <div
                        role="alert"
                        className="flex items-center justify-between gap-2 rounded-sm border bg-card p-3 text-sm text-destructive"
                    >
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
                <div
                    className={cn(
                        "flex-1 min-h-0 overflow-hidden rounded-sm border bg-card",
                        isFetching && !!data && "opacity-60",
                    )}
                    aria-busy={isFetching && !!data ? true : undefined}
                >
                    <Table
                        className="min-w-176"
                        containerClassName="h-full overflow-auto"
                    >
                        <TableHeader className="sticky top-0 z-10 bg-muted">
                            {table.getHeaderGroups().map((headerGroup) => (
                                <TableRow
                                    key={headerGroup.id}
                                    className="border-0 hover:bg-transparent"
                                >
                                    {headerGroup.headers.map((header) => {
                                        const isSorted =
                                            header.column.getIsSorted();
                                        const isRight =
                                            RIGHT_ALIGNED_COLUMNS.has(
                                                header.column.id,
                                            );
                                        const canSort =
                                            header.column.getCanSort();
                                        return (
                                            <TableHead
                                                key={header.id}
                                                className={cn(
                                                    HEADER_CLASS,
                                                    isRight && "text-right",
                                                )}
                                                aria-sort={
                                                    isSorted === "asc"
                                                        ? "ascending"
                                                        : isSorted === "desc"
                                                          ? "descending"
                                                          : undefined
                                                }
                                            >
                                                {header.isPlaceholder ? null : canSort ? (
                                                    <button
                                                        type="button"
                                                        className={cn(
                                                            "flex w-full items-center gap-1 uppercase tracking-wider",
                                                            isRight &&
                                                                "justify-end",
                                                        )}
                                                        onClick={(e) =>
                                                            header.column.getToggleSortingHandler()?.(
                                                                e,
                                                            )
                                                        }
                                                    >
                                                        <table.FlexRender
                                                            header={header}
                                                        />
                                                        {isSorted === "asc" ? (
                                                            <ArrowUp
                                                                aria-hidden="true"
                                                                className="size-3 shrink-0"
                                                            />
                                                        ) : isSorted ===
                                                          "desc" ? (
                                                            <ArrowDown
                                                                aria-hidden="true"
                                                                className="size-3 shrink-0"
                                                            />
                                                        ) : (
                                                            <ArrowUpDown
                                                                aria-hidden="true"
                                                                className="size-3 shrink-0 opacity-50"
                                                            />
                                                        )}
                                                    </button>
                                                ) : (
                                                    <table.FlexRender
                                                        header={header}
                                                    />
                                                )}
                                            </TableHead>
                                        );
                                    })}
                                </TableRow>
                            ))}
                        </TableHeader>
                        <TableBody>
                            {isLoading ? (
                                Array.from({ length: 8 }).map((_, i) => (
                                    <TableRow key={i}>
                                        {table
                                            .getAllLeafColumns()
                                            .map((col) => (
                                                <TableCell
                                                    key={col.id}
                                                    className={cn(
                                                        RIGHT_ALIGNED_COLUMNS.has(
                                                            col.id,
                                                        ) && "text-right",
                                                    )}
                                                >
                                                    <Skeleton className="h-4 w-full rounded-sm" />
                                                </TableCell>
                                            ))}
                                    </TableRow>
                                ))
                            ) : table.getRowModel().rows.length === 0 ? (
                                <TableRow>
                                    <TableCell
                                        colSpan={columns.length}
                                        className="h-24 text-center text-muted-foreground"
                                    >
                                        {search.q || search.stock ? (
                                            <div className="flex flex-col items-center gap-2">
                                                <span>
                                                    No products match the
                                                    filters
                                                </span>
                                                <Button
                                                    variant="outline"
                                                    size="sm"
                                                    onClick={() =>
                                                        updateSearch({
                                                            q: undefined,
                                                            stock: undefined,
                                                        })
                                                    }
                                                >
                                                    Clear filters
                                                </Button>
                                            </div>
                                        ) : search.categoryId ? (
                                            "No products in this category"
                                        ) : (
                                            "No products"
                                        )}
                                    </TableCell>
                                </TableRow>
                            ) : (
                                table
                                    .getRowModel()
                                    .rows.map((row) => (
                                        <DraggableProductRow
                                            key={row.id}
                                            row={row}
                                        />
                                    ))
                            )}
                        </TableBody>
                    </Table>
                </div>
                <MoveToCategoryDialog
                    open={moveProductState !== null}
                    onOpenChange={(open) => {
                        if (!open) setMoveProductState(null);
                    }}
                    title={
                        moveProductState
                            ? `Move "${moveProductState.name}"`
                            : ""
                    }
                    description="Choose a category for this product."
                    options={moveOptions}
                    getReturnFocusTarget={getReturnFocusTarget}
                    onSelect={(selectedId) => {
                        if (selectedId === null || !moveProductState) return;
                        moveTargetCategoryRef.current = selectedId;
                        void moveProduct({
                            id: moveProductState.id,
                            categoryId: selectedId,
                            name: moveProductState.name,
                        });
                    }}
                />
            </div>
        </ProductMoveContext.Provider>
    );
}
