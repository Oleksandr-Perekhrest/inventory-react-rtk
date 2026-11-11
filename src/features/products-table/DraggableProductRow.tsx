// outsource dependencies
import { cn } from "cn";
import { useDraggable } from "@dnd-kit/react";
import type { Row } from "@tanstack/react-table";
import { flexRender } from "@tanstack/react-table";

// local dependencies
import type { Product } from "@/domain";
import { useMediaQuery } from "@/hooks/use-media-query";
import { TableRow, TableCell } from "@/components/ui/table";
import { toProductDraggableId } from "@/features/category-tree/dnd";
import { features, WRAPPING_COLUMNS, RIGHT_ALIGNED_COLUMNS } from "./columns";

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
                        RIGHT_ALIGNED_COLUMNS.has(cell.column.id) &&
                            "text-right",
                        WRAPPING_COLUMNS.has(cell.column.id) &&
                            "whitespace-normal",
                    )}
                >
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                </TableCell>
            ))}
        </TableRow>
    );
}
