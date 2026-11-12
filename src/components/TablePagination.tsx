// outsource dependencies
import { cn } from "cn";
import { ChevronLeft, ChevronRight } from "lucide-react";

const DEFAULT_PAGE_SIZES = [10, 20, 50];

const NAV_BTN =
    "flex size-7 items-center justify-center rounded-sm border border-border transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring";

type Props = {
    page: number;
    pageSize: number;
    total: number;
    onPageChange: (page: number) => void;
    onPageSizeChange: (pageSize: number) => void;
    onPrefetchPage?: (page: number) => void;
    idPrefix?: string;
};

export function TablePagination({
    page,
    pageSize,
    total,
    onPageChange,
    onPageSizeChange,
    onPrefetchPage,
    idPrefix,
}: Props) {
    const lastPage = total > 0 ? Math.ceil(total / pageSize) : 1;
    const isFirst = page <= 1;
    const isLast = page >= lastPage;
    const selectId = idPrefix ?? "rows-per-page";

    const pageSizeOptions = DEFAULT_PAGE_SIZES.includes(pageSize)
        ? DEFAULT_PAGE_SIZES
        : [...DEFAULT_PAGE_SIZES, pageSize].sort((a, b) => a - b);

    return (
        <nav
            aria-label="Pagination"
            className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2 text-sm"
        >
            <div className="flex items-center gap-2 whitespace-nowrap text-muted-foreground">
                <label htmlFor={selectId}>Rows per page</label>
                <select
                    id={selectId}
                    value={pageSize}
                    onChange={(e) => onPageSizeChange(Number(e.target.value))}
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
                    <span className="whitespace-nowrap font-mono text-sm tabular-nums text-muted-foreground">
                        {`${(page - 1) * pageSize + 1}–${Math.min(page * pageSize, total)} of ${total}`}
                    </span>
                )}
                <div className="flex items-center gap-1">
                    <button
                        type="button"
                        aria-label="Previous page"
                        disabled={isFirst}
                        onClick={() => onPageChange(page - 1)}
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
                        onClick={() => onPageChange(page + 1)}
                        onMouseEnter={() =>
                            !isLast && onPrefetchPage?.(page + 1)
                        }
                        onFocus={() => !isLast && onPrefetchPage?.(page + 1)}
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
