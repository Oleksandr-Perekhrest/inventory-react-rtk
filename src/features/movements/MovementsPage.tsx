// outsource dependencies
import { X, SlidersHorizontal } from "lucide-react";
import { useRef, useState, useCallback } from "react";

// local dependencies
import { Button } from "@/components/ui/button";
import { MovementsTable } from "./MovementsTable";
import { activeFilterCount } from "./journalSearch";
import { MovementsFilters } from "./MovementsFilters";
import { useMediaQuery } from "@/hooks/use-media-query";
import { MovementsPagination } from "./MovementsPagination";
import { FullHeightPage } from "@/components/layout/FullHeightPage";
import { useJournalSearch, useJournalMovements } from "./useJournalSearch";
import {
    Sheet,
    SheetClose,
    SheetTitle,
    SheetContent,
    SheetTrigger,
} from "@/components/ui/sheet";

export function MovementsPage() {
    const isDesktop = useMediaQuery("(min-width: 1024px)");
    const [sheetOpen, setSheetOpen] = useState(false);
    const sheetBodyRef = useRef<HTMLDivElement>(null);
    const { data } = useJournalMovements();
    const { search, updateSearch } = useJournalSearch();
    const filterCount = activeFilterCount(search);
    const total = data?.total ?? 0;

    function clearFilters() {
        updateSearch({
            from: undefined,
            to: undefined,
            type: undefined,
            productId: undefined,
        });
    }

    const handleOpenAutoFocus = useCallback((e: Event) => {
        e.preventDefault();
        sheetBodyRef.current?.focus();
    }, []);

    return (
        <FullHeightPage
            header={
                <>
                    <div>
                        <h1 className="text-2xl font-semibold">Movements</h1>
                        {data !== undefined && (
                            <p className="text-sm text-muted-foreground">
                                {`${new Intl.NumberFormat("en-US").format(total)} movement${total !== 1 ? "s" : ""}`}
                            </p>
                        )}
                    </div>
                    {isDesktop ? (
                        <MovementsFilters />
                    ) : (
                        <div className="flex items-center gap-2">
                            <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
                                <SheetTrigger asChild>
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        aria-label={
                                            filterCount > 0
                                                ? `Filters, ${filterCount} active`
                                                : "Filters"
                                        }
                                    >
                                        <SlidersHorizontal
                                            aria-hidden="true"
                                            className="size-4"
                                        />
                                        <span>Filters</span>
                                        {filterCount > 0 && (
                                            <span
                                                aria-hidden="true"
                                                className="flex size-4 items-center justify-center rounded-full bg-primary font-mono text-[10px] font-semibold text-primary-foreground"
                                            >
                                                {filterCount}
                                            </span>
                                        )}
                                    </Button>
                                </SheetTrigger>
                                <SheetContent
                                    side="right"
                                    showCloseButton={false}
                                    aria-describedby={undefined}
                                    className="flex flex-col gap-4 overflow-y-auto p-4"
                                    onOpenAutoFocus={handleOpenAutoFocus}
                                >
                                    <div className="flex items-center justify-between">
                                        <SheetTitle>Filters</SheetTitle>
                                        <SheetClose asChild>
                                            <Button
                                                variant="ghost"
                                                size="icon-sm"
                                            >
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
                                        className="flex-1 outline-none"
                                    >
                                        <MovementsFilters layout="stacked" />
                                    </div>
                                    <SheetClose asChild>
                                        <Button className="w-full">
                                            {`Show ${new Intl.NumberFormat("en-US").format(total)} movement${total !== 1 ? "s" : ""}`}
                                        </Button>
                                    </SheetClose>
                                </SheetContent>
                            </Sheet>
                            {filterCount > 0 && (
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={clearFilters}
                                >
                                    Clear filters
                                </Button>
                            )}
                        </div>
                    )}
                </>
            }
            footer={<MovementsPagination />}
        >
            <MovementsTable />
        </FullHeightPage>
    );
}
