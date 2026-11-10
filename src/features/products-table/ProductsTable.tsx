// outsource dependencies
import { cn } from "cn";
import { useMemo } from "react";
import { useTable } from "@tanstack/react-table";
import { ArrowUp, ArrowDown, ArrowUpDown } from "lucide-react";

// local dependencies
import type { Product } from "../../domain";
import { columns, features } from "./columns";
import { Button } from "@/components/ui/button";
import { getErrorMessage } from "../../api/errors";
import { Skeleton } from "@/components/ui/skeleton";
import type { CatalogSearch } from "../catalog/catalogSearch";
import {
    useCatalogSearch,
    useCatalogProducts,
} from "../catalog/useCatalogSearch";
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
const RIGHT_ALIGN = new Set(["quantity", "minQuantity", "price"]);
const EMPTY_PRODUCTS: Product[] = [];

function isSortKey(id: string): id is CatalogSearch["sort"] {
    return id === "name" || id === "sku" || id === "quantity" || id === "price";
}

export function ProductsTable() {
    const { search, updateSearch } = useCatalogSearch();
    const { data, isLoading, isFetching, isError, error, refetch } =
        useCatalogProducts();

    const sorting = useMemo(
        () => [{ id: search.sort, desc: search.order === "desc" }],
        [search.sort, search.order],
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
        return (
            <div
                role="alert"
                className="flex flex-col gap-2 rounded-sm border bg-card p-4 text-sm text-destructive"
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
        <div
            className={cn(
                "overflow-hidden rounded-sm border bg-card",
                isFetching && !!data && "opacity-60",
            )}
            aria-busy={isFetching && !!data ? true : undefined}
        >
            <Table>
                <TableHeader>
                    {table.getHeaderGroups().map((headerGroup) => (
                        <TableRow
                            key={headerGroup.id}
                            className="border-0 hover:bg-transparent"
                        >
                            {headerGroup.headers.map((header) => {
                                const isSorted = header.column.getIsSorted();
                                const isRight = RIGHT_ALIGN.has(
                                    header.column.id,
                                );
                                const canSort = header.column.getCanSort();
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
                                                    isRight && "justify-end",
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
                                                ) : isSorted === "desc" ? (
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
                                            <table.FlexRender header={header} />
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
                                {table.getAllLeafColumns().map((col) => (
                                    <TableCell
                                        key={col.id}
                                        className={cn(
                                            RIGHT_ALIGN.has(col.id) &&
                                                "text-right",
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
                                {search.categoryId
                                    ? "No products in this category"
                                    : "No products"}
                            </TableCell>
                        </TableRow>
                    ) : (
                        table.getRowModel().rows.map((row) => (
                            <TableRow key={row.id}>
                                {row.getAllCells().map((cell) => (
                                    <TableCell
                                        key={cell.id}
                                        className={cn(
                                            RIGHT_ALIGN.has(cell.column.id) &&
                                                "text-right",
                                        )}
                                    >
                                        <table.FlexRender cell={cell} />
                                    </TableCell>
                                ))}
                            </TableRow>
                        ))
                    )}
                </TableBody>
            </Table>
        </div>
    );
}
