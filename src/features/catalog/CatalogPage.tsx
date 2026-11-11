// outsource dependencies
import { X, ChevronDown } from "lucide-react";
import { useRef, useState, useCallback } from "react";

// local dependencies
import { Button } from "@/components/ui/button";
import { useMediaQuery } from "@/hooks/use-media-query";
import { CatalogDndProvider } from "./CatalogDndProvider";
import { useGetCategoriesQuery } from "@/api/endpoints/categories";
import { CategoryTree } from "@/features/category-tree/CategoryTree";
import { ProductsTable } from "@/features/products-table/ProductsTable";
import { useSelectedCategoryId } from "@/features/catalog/useCatalogSearch";
import { ProductsToolbar } from "@/features/products-table/ProductsToolbar";
import { ProductsPagination } from "@/features/products-table/ProductsPagination";
import { ProductsTableHeader } from "@/features/products-table/ProductsTableHeader";
import {
    Sheet,
    SheetClose,
    SheetTitle,
    SheetContent,
    SheetTrigger,
} from "@/components/ui/sheet";

export function CatalogPage() {
    const isDesktop = useMediaQuery("(min-width: 1024px)");
    const [sheetOpen, setSheetOpen] = useState(false);
    const sheetBodyRef = useRef<HTMLDivElement>(null);

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

    const handleOpenAutoFocus = useCallback((e: Event) => {
        e.preventDefault();
        const treeItem = sheetBodyRef.current?.querySelector<HTMLElement>(
            '[role="treeitem"][tabindex="0"]',
        );
        (treeItem ?? sheetBodyRef.current)?.focus();
    }, []);

    return (
        <CatalogDndProvider>
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
                                <Button
                                    variant="outline"
                                    className="w-full justify-start gap-2"
                                >
                                    <span className="min-w-0 truncate">
                                        {triggerLabel}
                                    </span>
                                    <ChevronDown
                                        aria-hidden="true"
                                        className="ml-auto size-4 shrink-0"
                                    />
                                </Button>
                            </SheetTrigger>
                            <SheetContent
                                side="left"
                                showCloseButton={false}
                                aria-describedby={undefined}
                                className="overflow-y-auto p-4"
                                onOpenAutoFocus={handleOpenAutoFocus}
                            >
                                <div className="flex items-center justify-between">
                                    <SheetTitle>Categories</SheetTitle>
                                    <SheetClose asChild>
                                        <Button variant="ghost" size="icon-sm">
                                            <X aria-hidden="true" />
                                            <span className="sr-only">
                                                Close
                                            </span>
                                        </Button>
                                    </SheetClose>
                                </div>
                                <div
                                    ref={sheetBodyRef}
                                    tabIndex={-1}
                                    className="outline-none"
                                >
                                    <CategoryTree
                                        variant="sheet"
                                        onCategorySelected={
                                            handleCategorySelected
                                        }
                                    />
                                </div>
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
        </CatalogDndProvider>
    );
}
