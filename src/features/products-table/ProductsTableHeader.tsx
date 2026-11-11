// outsource dependencies
import { useMemo, useState } from "react";
import { X, MoreHorizontal } from "lucide-react";

// local dependencies
import { Button } from "@/components/ui/button";
import { useGetCategoriesQuery } from "@/api/endpoints/categories";
import { buildMoveTargets } from "@/features/category-tree/moveTargets";
import { MoveToCategoryDialog } from "@/features/category-tree/MoveToCategoryDialog";
import {
    useMoveCommands,
    categoryMoveToEnd,
} from "@/features/catalog/moveCommands";
import {
    useSelectCategory,
    useCatalogProducts,
    useSelectedCategoryId,
} from "@/features/catalog/useCatalogSearch";
import {
    DropdownMenu,
    DropdownMenuItem,
    DropdownMenuContent,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export function ProductsTableHeader() {
    const [dialogOpen, setDialogOpen] = useState(false);
    const categoryId = useSelectedCategoryId();
    const {
        data,
        name: categoryName,
        categoryExists,
    } = useGetCategoriesQuery(undefined, {
        selectFromResult: ({ data }) => ({
            data,
            name:
                categoryId !== undefined
                    ? (data?.entities[categoryId]?.name ?? "Unknown category")
                    : undefined,
            categoryExists:
                categoryId !== undefined
                    ? data?.entities[categoryId] !== undefined
                    : false,
        }),
    });
    const selectCategory = useSelectCategory();
    const { data: productsData } = useCatalogProducts();
    const { moveCategory } = useMoveCommands();

    const title =
        categoryId !== undefined
            ? (categoryName ?? "Unknown category")
            : "All products";

    const options = useMemo(
        () =>
            dialogOpen && data !== undefined && categoryId !== undefined
                ? buildMoveTargets(data, { kind: "category", categoryId })
                : [],
        [dialogOpen, data, categoryId],
    );

    return (
        <div className="flex items-center gap-2">
            <h2 className="min-w-0 truncate text-lg font-semibold">{title}</h2>
            {categoryId !== undefined && categoryExists && (
                <>
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button
                                variant="ghost"
                                size="icon"
                                className="shrink-0"
                                aria-label={`Actions for category ${categoryName ?? ""}`}
                            >
                                <MoreHorizontal
                                    aria-hidden="true"
                                    className="size-4"
                                />
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent>
                            <DropdownMenuItem
                                onSelect={() => setDialogOpen(true)}
                            >
                                Move category…
                            </DropdownMenuItem>
                        </DropdownMenuContent>
                    </DropdownMenu>
                    <MoveToCategoryDialog
                        open={dialogOpen}
                        onOpenChange={setDialogOpen}
                        title={`Move "${categoryName ?? ""}"`}
                        description="Choose a new parent. The category is placed last."
                        options={options}
                        onSelect={(selectedId) => {
                            if (data === undefined || categoryId === undefined)
                                return;
                            void moveCategory(
                                categoryMoveToEnd(data, categoryId, selectedId),
                            );
                        }}
                    />
                </>
            )}
            {categoryId !== undefined && (
                <button
                    type="button"
                    aria-label="Show all products"
                    onClick={() => selectCategory(undefined)}
                    className="shrink-0 rounded-sm p-0.5 text-muted-foreground hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
                >
                    <X aria-hidden="true" className="size-4" />
                </button>
            )}
            <span
                aria-live="polite"
                className="ml-auto shrink-0 whitespace-nowrap font-mono text-sm text-muted-foreground"
            >
                {productsData !== undefined &&
                    `${productsData.total} ${productsData.total === 1 ? "product" : "products"}`}
            </span>
        </div>
    );
}
