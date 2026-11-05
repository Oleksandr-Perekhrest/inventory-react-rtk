// outsource dependencies
import { cn } from "cn";
import { Search, ArrowUp } from "lucide-react";

// local dependencies
import type { ProductRow } from "./data";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { PRODUCTS, getStockStatus } from "./data";
import { Checkbox } from "@/components/ui/checkbox";
import {
    Table,
    TableRow,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
} from "@/components/ui/table";

const HEADER =
    "h-9 bg-muted px-3 font-mono text-[11px] font-semibold uppercase tracking-wider text-muted-foreground";

function StockCell({ product }: { product: ProductRow }) {
    const status = getStockStatus(product);
    const fillPct = Math.min(100, (product.stock / (2 * product.min)) * 100);
    return (
        <div className="flex items-center gap-2">
            <div
                className="h-1.5 w-14 overflow-hidden bg-border"
                aria-hidden="true"
            >
                <div
                    className={cn(
                        "h-full",
                        status === "low"
                            ? "bg-warning-foreground"
                            : "bg-muted-foreground",
                    )}
                    style={{ width: `${fillPct}%` }}
                />
            </div>
            <span className="min-w-[2.5rem] text-right font-mono">
                {product.stock}
            </span>
            {status === "low" && (
                <span className="rounded-sm bg-warning px-1.5 font-mono text-[10px] font-semibold uppercase tracking-wider text-warning-foreground">
                    LOW
                </span>
            )}
            {status === "out" && (
                <span className="rounded-sm bg-stock-out px-1.5 font-mono text-[10px] font-semibold uppercase tracking-wider text-stock-out-foreground">
                    OUT
                </span>
            )}
        </div>
    );
}

function ProductTableRow({ product }: { product: ProductRow }) {
    return (
        <TableRow>
            <TableCell className="px-3 py-2 font-mono text-xs text-muted-foreground">
                {product.sku}
            </TableCell>
            <TableCell className="px-3 py-2 font-medium">
                {product.name}
            </TableCell>
            <TableCell className="px-3 py-2 text-muted-foreground">
                {product.unit}
            </TableCell>
            <TableCell className="px-3 py-2">
                <StockCell product={product} />
            </TableCell>
            <TableCell className="px-3 py-2 text-right font-mono tabular-nums">
                {product.min}
            </TableCell>
            <TableCell className="px-3 py-2 text-right font-mono tabular-nums">
                {product.price}
            </TableCell>
            <TableCell className="px-3 py-2 text-muted-foreground">
                {product.updated}
            </TableCell>
        </TableRow>
    );
}

export function ProductsPanel() {
    const belowMin = PRODUCTS.filter((p) => {
        const s = getStockStatus(p);
        return s === "low" || s === "out";
    }).length;

    return (
        <div className="flex min-w-0 flex-1 flex-col gap-4">
            <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-semibold">Dairy</h1>
                    <p className="font-mono text-xs uppercase text-muted-foreground">
                        24 SKU · {belowMin} BELOW MIN
                    </p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                    <div className="relative">
                        <label className="sr-only" htmlFor="product-filter">
                            Filter products
                        </label>
                        <Search className="absolute left-2 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
                        <Input
                            id="product-filter"
                            placeholder="Name or SKU"
                            className="w-56 pl-7"
                        />
                    </div>
                    <div className="flex h-9 items-center gap-2 rounded-sm border bg-card px-3">
                        <Checkbox id="below-min-filter" />
                        <label
                            htmlFor="below-min-filter"
                            className="text-sm leading-none"
                        >
                            Below minimum
                        </label>
                    </div>
                </div>
            </div>
            <div className="overflow-hidden rounded-sm border bg-card">
                <Table>
                    <TableHeader>
                        <TableRow className="border-0 hover:bg-transparent">
                            <TableHead className={HEADER}>SKU</TableHead>
                            <TableHead className={HEADER} aria-sort="ascending">
                                <div className="flex items-center gap-1">
                                    Product
                                    <ArrowUp className="size-3" />
                                </div>
                            </TableHead>
                            <TableHead className={HEADER}>Unit</TableHead>
                            <TableHead className={HEADER}>Stock</TableHead>
                            <TableHead className={cn(HEADER, "text-right")}>
                                Min
                            </TableHead>
                            <TableHead className={cn(HEADER, "text-right")}>
                                Price
                            </TableHead>
                            <TableHead className={HEADER}>Updated</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {PRODUCTS.map((product) => (
                            <ProductTableRow
                                key={product.sku}
                                product={product}
                            />
                        ))}
                    </TableBody>
                </Table>
                <div className="flex items-center justify-between border-t px-4 py-2">
                    <span className="font-mono text-xs text-muted-foreground">
                        1–8 OF 24
                    </span>
                    <div className="flex gap-2">
                        <Button
                            variant="outline"
                            size="sm"
                            disabled
                            className="font-mono uppercase"
                        >
                            Prev
                        </Button>
                        <Button
                            variant="outline"
                            size="sm"
                            className="font-mono uppercase"
                        >
                            Next
                        </Button>
                    </div>
                </div>
            </div>
        </div>
    );
}
