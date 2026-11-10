// outsource dependencies
import { cn } from "cn";
import { useEffect } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

// local dependencies
import { productsApi } from "@/api/endpoints/products";
import { toProductsParams } from "@/features/catalog/catalogSearch";
import {
    useCatalogSearch,
    useCatalogProducts,
} from "@/features/catalog/useCatalogSearch";

const DEFAULT_PAGE_SIZES = [10, 20, 50];

const NAV_BTN =
    "flex size-7 items-center justify-center rounded-sm border border-border transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring";

export function ProductsPagination() {
    const { search, updateSearch } = useCatalogSearch();
    const { data } = useCatalogProducts();
    const prefetchProducts = productsApi.usePrefetch("getProducts");

    const total = data?.total ?? 0;
    const { page, pageSize } = search;
    const lastPage = total > 0 ? Math.ceil(total / pageSize) : 1;
    const isFirst = page <= 1;
    const isLast = page >= lastPage;

    const pageSizeOptions = DEFAULT_PAGE_SIZES.includes(pageSize)
        ? DEFAULT_PAGE_SIZES
        : [...DEFAULT_PAGE_SIZES, pageSize].sort((a, b) => a - b);

    // Redirect to last valid page when current page is out of bounds
    useEffect(() => {
        if (!data || data.total === 0) return;
        const computedLast = Math.ceil(data.total / search.pageSize);
        if (search.page > computedLast) {
            updateSearch({ page: computedLast }, { replace: true });
        }
    }, [data, search.page, search.pageSize, updateSearch]);

    return (
        <nav
            aria-label="Pagination"
            className="flex items-center justify-between gap-4 text-sm"
        >
            <div className="flex items-center gap-2 text-muted-foreground">
                <label htmlFor="rows-per-page">Rows per page</label>
                <select
                    id="rows-per-page"
                    value={pageSize}
                    onChange={(e) =>
                        updateSearch({ pageSize: Number(e.target.value) })
                    }
                    className="rounded-sm border border-border bg-background px-2 py-0.5 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                    {pageSizeOptions.map((size) => (
                        <option key={size} value={size}>
                            {size}
                        </option>
                    ))}
                </select>
            </div>

            <div className="flex items-center gap-3">
                {total > 0 && (
                    <span className="font-mono text-sm tabular-nums text-muted-foreground">
                        {`${(page - 1) * pageSize + 1}–${Math.min(page * pageSize, total)} of ${total}`}
                    </span>
                )}
                <div className="flex items-center gap-1">
                    <button
                        type="button"
                        aria-label="Previous page"
                        disabled={isFirst}
                        onClick={() => updateSearch({ page: page - 1 })}
                        className={cn(
                            NAV_BTN,
                            isFirst
                                ? "cursor-not-allowed opacity-40"
                                : "hover:bg-muted",
                        )}
                    >
                        <ChevronLeft aria-hidden="true" className="size-4" />
                    </button>
                    <button
                        type="button"
                        aria-label="Next page"
                        disabled={isLast}
                        onClick={() => updateSearch({ page: page + 1 })}
                        onMouseEnter={() =>
                            !isLast &&
                            prefetchProducts(
                                toProductsParams({
                                    ...search,
                                    page: page + 1,
                                }),
                            )
                        }
                        onFocus={() =>
                            !isLast &&
                            prefetchProducts(
                                toProductsParams({
                                    ...search,
                                    page: page + 1,
                                }),
                            )
                        }
                        className={cn(
                            NAV_BTN,
                            isLast
                                ? "cursor-not-allowed opacity-40"
                                : "hover:bg-muted",
                        )}
                    >
                        <ChevronRight aria-hidden="true" className="size-4" />
                    </button>
                </div>
            </div>
        </nav>
    );
}
