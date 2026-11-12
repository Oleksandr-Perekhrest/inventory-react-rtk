// outsource dependencies
import { Link } from "@tanstack/react-router";

// local dependencies
import { stockStatus } from "@/domain";
import { getErrorMessage } from "@/api/errors";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { StockBadge } from "@/components/StockBadge";
import { useGetDashboardQuery } from "@/api/endpoints/dashboard";
import { formatQuantity } from "@/features/products-table/helpers";
import { Card, CardHeader, CardContent } from "@/components/ui/card";

const SKELETONS = Array.from({ length: 5 });

export function RunningLowPanel() {
    const { data, isLoading, isError, error, refetch } = useGetDashboardQuery();

    return (
        <section>
            <Card className="rounded-sm">
                <CardHeader>
                    <h2 className="text-base font-medium">Running low</h2>
                </CardHeader>
                <CardContent>
                    {isError && !data ? (
                        <div
                            role="alert"
                            className="flex flex-col gap-2 text-sm text-destructive"
                        >
                            <span>{getErrorMessage(error)}</span>
                            <Button
                                variant="outline"
                                size="sm"
                                className="self-start"
                                onClick={() => void refetch()}
                            >
                                Retry
                            </Button>
                        </div>
                    ) : isLoading || !data ? (
                        <ul className="divide-y divide-border">
                            {SKELETONS.map((_, i) => (
                                <li
                                    key={i}
                                    className="flex items-start gap-3 py-2"
                                >
                                    <div className="min-w-0 flex-1 space-y-1.5">
                                        <Skeleton className="h-4 w-40 rounded-sm" />
                                        <Skeleton className="h-3 w-20 rounded-sm" />
                                    </div>
                                    <Skeleton className="h-4 w-24 shrink-0 rounded-sm" />
                                </li>
                            ))}
                        </ul>
                    ) : data.runningLow.length === 0 ? (
                        <p className="text-sm text-muted-foreground">
                            All products are above their minimum.
                        </p>
                    ) : (
                        <ul className="divide-y divide-border">
                            {data.runningLow.map((product) => (
                                <li
                                    key={product.id}
                                    className="flex items-start gap-3 py-2"
                                >
                                    <div className="min-w-0 flex-1">
                                        <Link
                                            to="/catalog"
                                            search={{ q: product.sku }}
                                            className="block truncate font-medium hover:underline focus-visible:underline focus-visible:outline-none"
                                        >
                                            {product.name}
                                        </Link>
                                        <p className="truncate font-mono text-xs text-muted-foreground">
                                            {product.sku}
                                        </p>
                                    </div>
                                    <div className="flex shrink-0 flex-col items-end gap-1">
                                        <span className="whitespace-nowrap font-mono tabular-nums text-sm">
                                            {formatQuantity(
                                                product.quantity,
                                                product.unit,
                                            )}{" "}
                                            /{" "}
                                            {formatQuantity(
                                                product.minQuantity,
                                                product.unit,
                                            )}
                                        </span>
                                        <StockBadge
                                            status={stockStatus(product)}
                                        />
                                    </div>
                                </li>
                            ))}
                        </ul>
                    )}
                </CardContent>
            </Card>
        </section>
    );
}
