// outsource dependencies
import { cn } from "cn";
import { useDraggable } from "@dnd-kit/react";
import type { Row } from "@tanstack/react-table";
import { flexRender } from "@tanstack/react-table";

// local dependencies
import { features } from "./columns";
import type { Product } from "@/domain";
import { useMediaQuery } from "@/hooks/use-media-query";
import { TableRow, TableCell } from "@/components/ui/table";
import { toProductDraggableId } from "@/features/category-tree/dnd";

const RIGHT_ALIGN = new Set(["quantity", "minQuantity", "price"]);
const WRAP_COLS = new Set(["name"]);

type Props = { row: Row<typeof features, Product> };

export function DraggableProductRow({ row }: Props) {
    const isLg = useMediaQuery("(min-width: 1024px)");
    const product = row.original;

    const { ref, isDragSource } = useDraggable({
        id: toProductDraggableId(product.id),
        type: "product",
        data: {
            productId: product.id,
            categoryId: product.categoryId,
            name: product.name,
        },
        disabled: !isLg,
    });

    return (
        <TableRow
            ref={ref}
            className={cn(isLg && "cursor-grab", isDragSource && "opacity-50")}
        >
            {row.getAllCells().map((cell) => (
                <TableCell
                    key={cell.id}
                    className={cn(
                        RIGHT_ALIGN.has(cell.column.id) && "text-right",
                        WRAP_COLS.has(cell.column.id) && "whitespace-normal",
                    )}
                >
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                </TableCell>
            ))}
        </TableRow>
    );
}
