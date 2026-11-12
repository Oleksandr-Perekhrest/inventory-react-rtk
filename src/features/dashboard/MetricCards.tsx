// outsource dependencies
import { Link } from "@tanstack/react-router";

// local dependencies
import { getErrorMessage } from "@/api/errors";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { formatPrice } from "@/features/products-table/helpers";
import { useGetDashboardQuery } from "@/api/endpoints/dashboard";
import { Card, CardHeader, CardContent } from "@/components/ui/card";

const LINK_CLASS =
    "block rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1";

const SKELETONS = Array.from({ length: 4 });

export function MetricCards() {
    const { data, isLoading, isError, error, refetch } = useGetDashboardQuery();

    if (isError && !data) {
        return (
            <div
                role="alert"
                className="flex flex-col gap-2 rounded-sm border bg-card p-4 text-sm text-destructive"
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
        );
    }

    if (isLoading || !data) {
        return (
            <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
                {SKELETONS.map((_, i) => (
                    <Card key={i} className="rounded-sm">
                        <CardHeader>
                            <Skeleton className="h-4 w-20 rounded-sm" />
                        </CardHeader>
                        <CardContent>
                            <Skeleton className="mt-1 h-7 w-24 rounded-sm" />
                        </CardContent>
                    </Card>
                ))}
            </div>
        );
    }

    return (
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            <Link to="/catalog" className={LINK_CLASS}>
                <Card className="h-full rounded-sm">
                    <CardHeader>
                        <p className="text-sm font-medium text-muted-foreground">
                            Stock value
                        </p>
                    </CardHeader>
                    <CardContent>
                        <p className="font-mono tabular-nums text-2xl font-semibold">
                            {formatPrice(data.stockValue)}
                        </p>
                    </CardContent>
                </Card>
            </Link>
            <Link
                to="/catalog"
                search={{ stock: "low" }}
                className={LINK_CLASS}
            >
                <Card className="h-full rounded-sm">
                    <CardHeader>
                        <p className="text-sm font-medium text-muted-foreground">
                            Low stock
                        </p>
                    </CardHeader>
                    <CardContent>
                        <p className="font-mono tabular-nums text-2xl font-semibold">
                            {data.lowStockCount}
                        </p>
                    </CardContent>
                </Card>
            </Link>
            <Link
                to="/catalog"
                search={{ stock: "out" }}
                className={LINK_CLASS}
            >
                <Card className="h-full rounded-sm">
                    <CardHeader>
                        <p className="text-sm font-medium text-muted-foreground">
                            Out of stock
                        </p>
                    </CardHeader>
                    <CardContent>
                        <p className="font-mono tabular-nums text-2xl font-semibold">
                            {data.outOfStockCount}
                        </p>
                    </CardContent>
                </Card>
            </Link>
            <Link to="/catalog" className={LINK_CLASS}>
                <Card className="h-full rounded-sm">
                    <CardHeader>
                        <p className="text-sm font-medium text-muted-foreground">
                            Products
                        </p>
                    </CardHeader>
                    <CardContent>
                        <p className="font-mono tabular-nums text-2xl font-semibold">
                            {data.productCount}
                        </p>
                    </CardContent>
                </Card>
            </Link>
        </div>
    );
}
