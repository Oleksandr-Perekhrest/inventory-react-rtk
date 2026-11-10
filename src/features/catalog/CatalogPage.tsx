// outsource dependencies
import { useState, useCallback } from "react";

// local dependencies
import { Button } from "@/components/ui/button";
import { useMediaQuery } from "@/hooks/use-media-query";
import { useGetCategoriesQuery } from "@/api/endpoints/categories";
import { CategoryTree } from "@/features/category-tree/CategoryTree";
import { ProductsTable } from "@/features/products-table/ProductsTable";
import { useSelectedCategoryId } from "@/features/catalog/useCatalogSearch";
import { ProductsToolbar } from "@/features/products-table/ProductsToolbar";
import { ProductsPagination } from "@/features/products-table/ProductsPagination";
import { ProductsTableHeader } from "@/features/products-table/ProductsTableHeader";
import {
    Sheet,
    SheetTitle,
    SheetContent,
    SheetTrigger,
} from "@/components/ui/sheet";

export function CatalogPage() {
    const isDesktop = useMediaQuery("(min-width: 1024px)");
    const [sheetOpen, setSheetOpen] = useState(false);

    const categoryId = useSelectedCategoryId();
    const { name: categoryName } = useGetCategoriesQuery(undefined, {
        selectFromResult: ({ data }) => ({
            name:
                categoryId !== undefined
                    ? (data?.entities[categoryId]?.name ?? "")
                    : undefined,
        }),
    });
    const triggerLabel =
        categoryId !== undefined
            ? `Category: ${categoryName || "..."}`
            : "Category: All products";

    const handleCategorySelected = useCallback(() => {
        setSheetOpen(false);
    }, []);

    return (
        <div className="p-6">
            <h1 className="mb-6 text-2xl font-semibold">Catalog</h1>
            <div className="flex flex-col gap-4 lg:flex-row lg:items-start">
                {isDesktop ? (
                    <div className="w-64 shrink-0">
                        <CategoryTree />
                    </div>
                ) : (
                    <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
                        <SheetTrigger asChild>
                            <Button variant="outline" className="w-full">
                                {triggerLabel}
                            </Button>
                        </SheetTrigger>
                        <SheetContent
                            side="left"
                            aria-describedby={undefined}
                            className="overflow-y-auto"
                        >
                            <SheetTitle>Categories</SheetTitle>
                            <CategoryTree
                                onCategorySelected={handleCategorySelected}
                            />
                        </SheetContent>
                    </Sheet>
                )}
                <div className="flex min-w-0 flex-1 flex-col gap-3">
                    <ProductsTableHeader />
                    <ProductsToolbar />
                    <ProductsTable />
                    <ProductsPagination />
                </div>
            </div>
        </div>
    );
}
