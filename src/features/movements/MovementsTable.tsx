// outsource dependencies
import { cn } from "cn";
import { Fragment } from "react";
import { ArrowUp, ArrowDown, ChevronRight } from "lucide-react";
import {
    useTable,
    flexRender,
    tableFeatures,
    createColumnHelper,
    rowExpandingFeature,
} from "@tanstack/react-table";

// local dependencies
import type { MovementType } from "@/domain";
import { Button } from "@/components/ui/button";
import { hasActiveFilters } from "./journalSearch";
import type { MovementListItem } from "@/api/types";
import { Skeleton } from "@/components/ui/skeleton";
import { getErrorStatus, getErrorMessage } from "@/api/errors";
import { useJournalSearch, useJournalMovements } from "./useJournalSearch";
import {
    Table,
    TableRow,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
} from "@/components/ui/table";
import {
    hasDetails,
    formatDateTime,
    discrepancyKind,
    formatLocalDate,
    formatSignedQuantity,
    formatQuantityWithUnit,
    formatDiscrepancyQuantity,
} from "./helpers";

const HEADER_CLASS =
    "h-9 bg-muted px-3 font-mono text-[11px] font-semibold uppercase tracking-wider text-muted-foreground";
const BADGE_CLASS =
    "rounded-sm px-1 font-mono text-[11px] font-semibold uppercase tracking-wider";
const RIGHT_ALIGNED_COLUMNS = new Set(["quantity"]);
const EMPTY_MOVEMENTS: MovementListItem[] = [];

const TYPE_COLORS: Record<MovementType, string> = {
    receipt: "bg-primary text-primary-foreground",
    shipment: "bg-secondary text-secondary-foreground",
    "write-off": "bg-stock-out text-stock-out-foreground",
    adjustment: "bg-warning text-warning-foreground",
};

function TypeBadge({ type }: { type: MovementType }) {
    return <span className={cn(BADGE_CLASS, TYPE_COLORS[type])}>{type}</span>;
}

const features = tableFeatures({ rowExpandingFeature });
const columnHelper = createColumnHelper<typeof features, MovementListItem>();

const DT_CLASS =
    "font-mono text-xs font-semibold uppercase tracking-wider text-muted-foreground whitespace-nowrap";

const columns = columnHelper.columns([
    columnHelper.display({
        id: "expand",
        header: () => <span className="sr-only">Details</span>,
        cell: (info) => {
            const { row } = info;
            if (!row.getCanExpand()) return null;
            const isExpanded = row.getIsExpanded();
            return (
                <button
                    type="button"
                    onClick={row.getToggleExpandedHandler()}
                    aria-expanded={isExpanded}
                    aria-controls={`detail-${row.id}`}
                    aria-label={`Details: ${row.original.product.name}`}
                    className="flex size-6 items-center justify-center rounded-sm text-muted-foreground hover:bg-accent hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                    <ChevronRight
                        aria-hidden="true"
                        className={cn(
                            "size-4 transition-transform",
                            isExpanded && "rotate-90",
                        )}
                    />
                </button>
            );
        },
    }),
    columnHelper.accessor("date", {
        id: "date",
        header: "Date",

        cell: (info) => (
            <span className="whitespace-nowrap font-mono tabular-nums">
                {formatDateTime(info.getValue())}
            </span>
        ),
    }),
    columnHelper.accessor("type", {
        id: "type",
        header: "Type",

        cell: (info) => <TypeBadge type={info.getValue()} />,
    }),
    columnHelper.accessor("product", {
        id: "product",
        header: "Product",

        cell: (info) => {
            const { name, sku } = info.getValue();
            return (
                <div>
                    <div>{name}</div>
                    <div className="font-mono text-xs text-muted-foreground">
                        {sku}
                    </div>
                </div>
            );
        },
    }),
    columnHelper.display({
        id: "quantity",
        header: "Quantity",

        cell: (info) => {
            const { type, quantity, expectedQuantity } = info.row.original;
            const { unit } = info.row.original.product;

            if (
                type === "receipt" &&
                expectedQuantity !== undefined &&
                quantity !== expectedQuantity
            ) {
                const kind = discrepancyKind(quantity, expectedQuantity);
                return (
                    <div className="flex items-center justify-end gap-1.5 whitespace-nowrap">
                        <span className="font-mono tabular-nums">
                            {formatDiscrepancyQuantity(
                                quantity,
                                expectedQuantity,
                                unit,
                            )}
                        </span>
                        <span
                            className={cn(
                                BADGE_CLASS,
                                kind === "short"
                                    ? "bg-warning text-warning-foreground"
                                    : "bg-secondary text-secondary-foreground",
                            )}
                        >
                            {kind === "short" ? "Short" : "Over"}
                        </span>
                    </div>
                );
            }

            return (
                <span className="whitespace-nowrap font-mono tabular-nums">
                    {formatSignedQuantity(quantity, unit)}
                </span>
            );
        },
    }),
    columnHelper.accessor("reference", {
        id: "reference",
        header: "Reference",

        cell: (info) => (
            <span className="font-mono text-sm">{info.getValue()}</span>
        ),
    }),
    columnHelper.accessor("supplier", {
        id: "supplier",
        header: "Supplier",

        cell: (info) => info.getValue()?.name ?? "—",
    }),
]);

export function MovementsTable() {
    const { search, updateSearch } = useJournalSearch();
    const { data, isLoading, isFetching, isError, error, refetch } =
        useJournalMovements();

    const table = useTable({
        features,
        columns,
        data: data?.items ?? EMPTY_MOVEMENTS,
        getRowId: (m) => m.id,
        getRowCanExpand: (row) => hasDetails(row.original),
    });

    if (isError && !data) {
        if (getErrorStatus(error) === 404 && search.productId !== undefined) {
            return (
                <div className="flex flex-col flex-1 min-h-0 items-center justify-center gap-2 rounded-sm border bg-card p-8 text-sm text-muted-foreground">
                    <span>{"This product doesn't exist"}</span>
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={() => updateSearch({ productId: undefined })}
                    >
                        Clear product filter
                    </Button>
                </div>
            );
        }
        return (
            <div
                role="alert"
                className="flex flex-col flex-1 min-h-0 gap-2 rounded-sm border bg-card p-4 text-sm text-destructive"
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
        <div className="flex flex-col flex-1 min-h-0 gap-2">
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
                    className="min-w-224"
                    containerClassName="h-full overflow-auto"
                >
                    <TableHeader className="sticky top-0 z-10 bg-muted">
                        {table.getHeaderGroups().map((headerGroup) => (
                            <TableRow
                                key={headerGroup.id}
                                className="border-0 hover:bg-transparent"
                            >
                                {headerGroup.headers.map((header) => {
                                    const isDate = header.column.id === "date";
                                    const isExpand =
                                        header.column.id === "expand";
                                    return (
                                        <TableHead
                                            key={header.id}
                                            className={cn(
                                                HEADER_CLASS,
                                                isExpand && "w-9 px-2",
                                                RIGHT_ALIGNED_COLUMNS.has(
                                                    header.column.id,
                                                ) && "text-right",
                                            )}
                                            aria-sort={
                                                isDate
                                                    ? search.order === "desc"
                                                        ? "descending"
                                                        : "ascending"
                                                    : undefined
                                            }
                                        >
                                            {header.isPlaceholder ? null : isDate ? (
                                                <button
                                                    type="button"
                                                    aria-label={
                                                        search.order === "desc"
                                                            ? "Date, sorted newest first"
                                                            : "Date, sorted oldest first"
                                                    }
                                                    className="flex w-full items-center gap-1 uppercase tracking-wider"
                                                    onClick={() =>
                                                        updateSearch({
                                                            order:
                                                                search.order ===
                                                                "desc"
                                                                    ? "asc"
                                                                    : "desc",
                                                        })
                                                    }
                                                >
                                                    {flexRender(
                                                        header.column.columnDef
                                                            .header,
                                                        header.getContext(),
                                                    )}
                                                    {search.order === "asc" ? (
                                                        <ArrowUp
                                                            aria-hidden="true"
                                                            className="size-3 shrink-0"
                                                        />
                                                    ) : (
                                                        <ArrowDown
                                                            aria-hidden="true"
                                                            className="size-3 shrink-0"
                                                        />
                                                    )}
                                                </button>
                                            ) : (
                                                flexRender(
                                                    header.column.columnDef
                                                        .header,
                                                    header.getContext(),
                                                )
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
                                                col.id === "expand" &&
                                                    "w-9 px-2",
                                                RIGHT_ALIGNED_COLUMNS.has(
                                                    col.id,
                                                ) && "text-right",
                                            )}
                                        >
                                            {col.id !== "expand" && (
                                                <Skeleton className="h-4 w-full rounded-sm" />
                                            )}
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
                                    {hasActiveFilters(search) ? (
                                        <div className="flex flex-col items-center gap-2">
                                            <span>
                                                No movements match these filters
                                            </span>
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                onClick={() =>
                                                    updateSearch({
                                                        from: undefined,
                                                        to: undefined,
                                                        type: undefined,
                                                        productId: undefined,
                                                    })
                                                }
                                            >
                                                Clear filters
                                            </Button>
                                        </div>
                                    ) : (
                                        "No movements found"
                                    )}
                                </TableCell>
                            </TableRow>
                        ) : (
                            table.getRowModel().rows.map((row) => {
                                const movement = row.original;
                                const isExpanded = row.getIsExpanded();
                                return (
                                    <Fragment key={row.id}>
                                        <TableRow>
                                            {row.getAllCells().map((cell) => (
                                                <TableCell
                                                    key={cell.id}
                                                    className={cn(
                                                        cell.column.id ===
                                                            "expand" &&
                                                            "w-9 px-2",
                                                        RIGHT_ALIGNED_COLUMNS.has(
                                                            cell.column.id,
                                                        ) && "text-right",
                                                    )}
                                                >
                                                    {flexRender(
                                                        cell.column.columnDef
                                                            .cell,
                                                        cell.getContext(),
                                                    )}
                                                </TableCell>
                                            ))}
                                        </TableRow>
                                        {isExpanded && (
                                            <tr id={`detail-${row.id}`}>
                                                <td
                                                    colSpan={
                                                        table.getAllLeafColumns()
                                                            .length
                                                    }
                                                    className="bg-muted/50 px-6 py-3"
                                                >
                                                    <dl className="grid grid-cols-[auto_1fr] gap-x-6 gap-y-1 text-sm">
                                                        {movement.expectedQuantity !==
                                                            undefined &&
                                                            movement.expectedQuantity !==
                                                                movement.quantity && (
                                                                <>
                                                                    <dt
                                                                        className={
                                                                            DT_CLASS
                                                                        }
                                                                    >
                                                                        Expected
                                                                    </dt>
                                                                    <dd className="font-mono tabular-nums">
                                                                        {formatQuantityWithUnit(
                                                                            movement.expectedQuantity,
                                                                            movement
                                                                                .product
                                                                                .unit,
                                                                        )}
                                                                    </dd>
                                                                    <dt
                                                                        className={
                                                                            DT_CLASS
                                                                        }
                                                                    >
                                                                        Actual
                                                                    </dt>
                                                                    <dd className="font-mono tabular-nums">
                                                                        {formatQuantityWithUnit(
                                                                            movement.quantity,
                                                                            movement
                                                                                .product
                                                                                .unit,
                                                                        )}
                                                                    </dd>
                                                                </>
                                                            )}
                                                        {movement.discrepancyNote !==
                                                            undefined && (
                                                            <>
                                                                <dt
                                                                    className={
                                                                        DT_CLASS
                                                                    }
                                                                >
                                                                    Discrepancy
                                                                    note
                                                                </dt>
                                                                <dd>
                                                                    {
                                                                        movement.discrepancyNote
                                                                    }
                                                                </dd>
                                                            </>
                                                        )}
                                                        {movement.batch !==
                                                            undefined && (
                                                            <>
                                                                <dt
                                                                    className={
                                                                        DT_CLASS
                                                                    }
                                                                >
                                                                    Batch
                                                                </dt>
                                                                <dd className="font-mono">
                                                                    {
                                                                        movement.batch
                                                                    }
                                                                </dd>
                                                            </>
                                                        )}
                                                        {movement.expiresAt !==
                                                            undefined && (
                                                            <>
                                                                <dt
                                                                    className={
                                                                        DT_CLASS
                                                                    }
                                                                >
                                                                    Expires
                                                                </dt>
                                                                <dd>
                                                                    {formatLocalDate(
                                                                        movement.expiresAt,
                                                                    )}
                                                                </dd>
                                                            </>
                                                        )}
                                                        {movement.comment !==
                                                            undefined && (
                                                            <>
                                                                <dt
                                                                    className={
                                                                        DT_CLASS
                                                                    }
                                                                >
                                                                    Comment
                                                                </dt>
                                                                <dd>
                                                                    {
                                                                        movement.comment
                                                                    }
                                                                </dd>
                                                            </>
                                                        )}
                                                    </dl>
                                                </td>
                                            </tr>
                                        )}
                                    </Fragment>
                                );
                            })
                        )}
                    </TableBody>
                </Table>
            </div>
        </div>
    );
}
