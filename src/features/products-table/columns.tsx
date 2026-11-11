// outsource dependencies
import {
    tableFeatures,
    rowSortingFeature,
    createColumnHelper,
} from "@tanstack/react-table";

// local dependencies
import type { Product } from "@/domain";
import { CategoryCell } from "./CategoryCell";
import { stockStatus, formatPrice, formatQuantity } from "./helpers";

export const features = tableFeatures({ rowSortingFeature });

export const RIGHT_ALIGNED_COLUMNS = new Set([
    "quantity",
    "minQuantity",
    "price",
]);
export const WRAPPING_COLUMNS = new Set(["name"]);

const columnHelper = createColumnHelper<typeof features, Product>();

export const columns = columnHelper.columns([
    columnHelper.accessor("name", {
        id: "name",
        header: "Name",
        enableSorting: true,
    }),
    columnHelper.accessor("sku", {
        id: "sku",
        header: "SKU",
        enableSorting: true,
        cell: (info) => <span className="font-mono">{info.getValue()}</span>,
    }),
    columnHelper.accessor("categoryId", {
        id: "categoryId",
        header: "Category",
        enableSorting: false,
        cell: (info) => <CategoryCell id={info.getValue()} />,
    }),
    columnHelper.accessor("quantity", {
        id: "quantity",
        header: "Quantity",
        enableSorting: true,
        cell: (info) => {
            const product = info.row.original;
            const status = stockStatus(product);
            return (
                <div className="flex items-center justify-end gap-2">
                    <span className="font-mono tabular-nums">
                        {formatQuantity(info.getValue(), product.unit)}
                    </span>
                    {status === "out" && (
                        <span className="rounded-sm bg-stock-out px-1 font-mono text-[11px] font-semibold uppercase tracking-wider text-stock-out-foreground">
                            Out
                        </span>
                    )}
                    {status === "low" && (
                        <span className="rounded-sm bg-warning px-1 font-mono text-[11px] font-semibold uppercase tracking-wider text-warning-foreground">
                            Low
                        </span>
                    )}
                </div>
            );
        },
    }),
    columnHelper.accessor("minQuantity", {
        id: "minQuantity",
        header: "Min",
        enableSorting: false,
        cell: (info) => (
            <span className="font-mono tabular-nums text-muted-foreground">
                {formatQuantity(info.getValue(), info.row.original.unit)}
            </span>
        ),
    }),
    columnHelper.accessor("price", {
        id: "price",
        header: "Price",
        enableSorting: true,
        cell: (info) => (
            <span className="font-mono tabular-nums">
                {formatPrice(info.getValue())}
            </span>
        ),
    }),
]);
