// outsource dependencies
import { Link } from "@tanstack/react-router";

// local dependencies
import { getErrorMessage } from "@/api/errors";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useGetMovementsQuery } from "@/api/endpoints/movements";
import { MovementTypeBadge } from "@/components/MovementTypeBadge";
import {
    formatDateTime,
    formatSignedQuantity,
} from "@/features/movements/helpers";
import {
    Card,
    CardHeader,
    CardFooter,
    CardContent,
} from "@/components/ui/card";

const QUERY_ARGS = { page: 1, pageSize: 5 };
const SKELETONS = Array.from({ length: 5 });

export function RecentMovementsPanel() {
    const { data, isLoading, isError, error, refetch } =
        useGetMovementsQuery(QUERY_ARGS);

    return (
        <section>
            <Card className="rounded-sm">
                <CardHeader>
                    <h2 className="text-base font-medium">Recent movements</h2>
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
                                <li key={i} className="py-2">
                                    <div className="flex items-center gap-2">
                                        <Skeleton className="h-4 w-16 rounded-sm" />
                                        <Skeleton className="h-4 flex-1 rounded-sm" />
                                    </div>
                                    <div className="mt-1 flex items-center justify-between gap-2">
                                        <Skeleton className="h-3 w-16 rounded-sm" />
                                        <Skeleton className="h-3 w-28 rounded-sm" />
                                    </div>
                                </li>
                            ))}
                        </ul>
                    ) : data.items.length === 0 ? (
                        <p className="text-sm text-muted-foreground">
                            No movements yet.
                        </p>
                    ) : (
                        <ul className="divide-y divide-border">
                            {data.items.map((movement) => (
                                <li key={movement.id} className="py-2">
                                    <div className="flex items-center gap-2">
                                        <MovementTypeBadge
                                            type={movement.type}
                                        />
                                        <span className="flex-1 truncate text-sm">
                                            {movement.product.name}
                                        </span>
                                    </div>
                                    <div className="mt-1 flex items-center justify-between gap-2">
                                        <span className="whitespace-nowrap font-mono tabular-nums text-sm">
                                            {formatSignedQuantity(
                                                movement.quantity,
                                                movement.product.unit,
                                            )}
                                        </span>
                                        <span className="whitespace-nowrap font-mono text-xs text-muted-foreground">
                                            {formatDateTime(movement.date)}
                                        </span>
                                    </div>
                                </li>
                            ))}
                        </ul>
                    )}
                </CardContent>
                <CardFooter>
                    <Link
                        to="/movements"
                        className="text-sm font-medium hover:underline focus-visible:underline focus-visible:outline-none"
                    >
                        View all
                    </Link>
                </CardFooter>
            </Card>
        </section>
    );
}
