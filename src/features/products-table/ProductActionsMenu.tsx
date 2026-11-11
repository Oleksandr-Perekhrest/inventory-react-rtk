// outsource dependencies
import { useMemo, useState } from "react";
import { MoreHorizontal } from "lucide-react";

// local dependencies
import type { Product } from "@/domain";
import { Button } from "@/components/ui/button";
import { useMoveCommands } from "@/features/catalog/moveCommands";
import { useGetCategoriesQuery } from "@/api/endpoints/categories";
import { buildMoveTargets } from "@/features/category-tree/moveTargets";
import { MoveToCategoryDialog } from "@/features/category-tree/MoveToCategoryDialog";
import {
    DropdownMenu,
    DropdownMenuItem,
    DropdownMenuContent,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

type Props = {
    product: Product;
};

export function ProductActionsMenu({ product }: Props) {
    const [dialogOpen, setDialogOpen] = useState(false);
    const { data } = useGetCategoriesQuery(undefined);
    const { moveProduct } = useMoveCommands();

    const options = useMemo(
        () =>
            dialogOpen && data
                ? buildMoveTargets(data, {
                      kind: "product",
                      categoryId: product.categoryId,
                  })
                : [],
        [dialogOpen, data, product.categoryId],
    );

    return (
        <>
            <DropdownMenu>
                <DropdownMenuTrigger asChild>
                    {/* Distance(6) constraint in dnd-kit already prevents accidental drags from a click */}
                    <Button
                        variant="ghost"
                        size="icon"
                        aria-label={`Actions for ${product.name}`}
                    >
                        <MoreHorizontal aria-hidden="true" className="size-4" />
                    </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent>
                    <DropdownMenuItem onSelect={() => setDialogOpen(true)}>
                        Move to category…
                    </DropdownMenuItem>
                </DropdownMenuContent>
            </DropdownMenu>
            <MoveToCategoryDialog
                open={dialogOpen}
                onOpenChange={setDialogOpen}
                title={`Move "${product.name}"`}
                description="Choose a category for this product."
                options={options}
                onSelect={(selectedId) => {
                    if (selectedId === null) return;
                    void moveProduct({
                        id: product.id,
                        categoryId: selectedId,
                        name: product.name,
                    });
                }}
            />
        </>
    );
}
