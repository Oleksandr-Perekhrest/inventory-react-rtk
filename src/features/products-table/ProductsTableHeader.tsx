// outsource dependencies
import { X } from "lucide-react";

// local dependencies
import { useGetCategoriesQuery } from "@/api/endpoints/categories";
import {
    useSelectCategory,
    useCatalogProducts,
    useSelectedCategoryId,
} from "@/features/catalog/useCatalogSearch";

export function ProductsTableHeader() {
    const categoryId = useSelectedCategoryId();
    const { name: categoryName } = useGetCategoriesQuery(undefined, {
        selectFromResult: ({ data }) => ({
            name:
                categoryId !== undefined
                    ? (data?.entities[categoryId]?.name ?? "Unknown category")
                    : undefined,
        }),
    });
    const selectCategory = useSelectCategory();
    const { data } = useCatalogProducts();

    const title =
        categoryId !== undefined
            ? (categoryName ?? "Unknown category")
            : "All products";

    return (
        <div className="flex items-center gap-2">
            <h2 className="min-w-0 truncate text-lg font-semibold">{title}</h2>
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
                {data !== undefined &&
                    `${data.total} ${data.total === 1 ? "product" : "products"}`}
            </span>
        </div>
    );
}
