// outsource dependencies
import { cn } from "cn";
import { ArrowUp, ArrowDown } from "lucide-react";
import {
    useTable,
    flexRender,
    tableFeatures,
    createColumnHelper,
} from "@tanstack/react-table";

// local dependencies
import type { MovementType } from "@/domain";
import { getErrorMessage } from "@/api/errors";
import { Button } from "@/components/ui/button";
import type { MovementListItem } from "@/api/types";
import { Skeleton } from "@/components/ui/skeleton";
import { useJournalSearch, useJournalMovements } from "./useJournalSearch";
import {
    formatDateTime,
    discrepancyKind,
    formatSignedQuantity,
    formatDiscrepancyQuantity,
} from "./helpers";
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

const features = tableFeatures({});
const columnHelper = createColumnHelper<typeof features, MovementListItem>();

const columns = columnHelper.columns([
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
        <>
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
                    "overflow-hidden rounded-sm border bg-card",
                    isFetching && !!data && "opacity-60",
                )}
                aria-busy={isFetching && !!data ? true : undefined}
            >
                <Table className="min-w-224">
                    <TableHeader>
                        {table.getHeaderGroups().map((headerGroup) => (
                            <TableRow
                                key={headerGroup.id}
                                className="border-0 hover:bg-transparent"
                            >
                                {headerGroup.headers.map((header) => {
                                    const isDate = header.column.id === "date";
                                    return (
                                        <TableHead
                                            key={header.id}
                                            className={cn(
                                                HEADER_CLASS,
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
                                    No movements found
                                </TableCell>
                            </TableRow>
                        ) : (
                            table.getRowModel().rows.map((row) => (
                                <TableRow key={row.id}>
                                    {row.getAllCells().map((cell) => (
                                        <TableCell
                                            key={cell.id}
                                            className={cn(
                                                RIGHT_ALIGNED_COLUMNS.has(
                                                    cell.column.id,
                                                ) && "text-right",
                                            )}
                                        >
                                            {flexRender(
                                                cell.column.columnDef.cell,
                                                cell.getContext(),
                                            )}
                                        </TableCell>
                                    ))}
                                </TableRow>
                            ))
                        )}
                    </TableBody>
                </Table>
            </div>
        </>
    );
}
