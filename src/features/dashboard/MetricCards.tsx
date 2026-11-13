// outsource dependencies
import type { ReactNode } from "react";
import { Link } from "@tanstack/react-router";

// local dependencies
import { getErrorMessage } from "@/api/errors";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { formatPrice } from "@/features/products-table/helpers";
import { useGetDashboardQuery } from "@/api/endpoints/dashboard";
import { Card, CardHeader, CardContent } from "@/components/ui/card";

const LINK_CLASS =
    "block h-full rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1";

type MetricCardProps = {
    label: string;
    value: ReactNode;
};

function MetricCard({ label, value }: MetricCardProps) {
    return (
        <Card className="h-full rounded-sm">
            <CardHeader>
                <p className="text-sm font-medium text-muted-foreground">
                    {label}
                </p>
            </CardHeader>
            <CardContent>
                <div className="font-mono tabular-nums text-2xl font-semibold">
                    {value}
                </div>
            </CardContent>
        </Card>
    );
}

export function MetricCards() {
    const { data, isError, error, refetch } = useGetDashboardQuery();

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

    const skeleton = <Skeleton className="h-7 w-24 rounded-sm" />;
    const values = data
        ? {
              stockValue: formatPrice(data.stockValue),
              lowStock: data.lowStockCount,
              outOfStock: data.outOfStockCount,
              products: data.productCount,
          }
        : {
              stockValue: skeleton,
              lowStock: skeleton,
              outOfStock: skeleton,
              products: skeleton,
          };

    return (
        <div className="grid grid-cols-3 gap-4 lg:grid-cols-4">
            <div className="col-span-3 lg:col-span-1">
                <MetricCard label="Stock value" value={values.stockValue} />
            </div>
            <Link
                to="/catalog"
                search={{ stock: "low" }}
                className={LINK_CLASS}
            >
                <MetricCard label="Low stock" value={values.lowStock} />
            </Link>
            <Link
                to="/catalog"
                search={{ stock: "out" }}
                className={LINK_CLASS}
            >
                <MetricCard label="Out of stock" value={values.outOfStock} />
            </Link>
            <Link to="/catalog" className={LINK_CLASS}>
                <MetricCard label="Products" value={values.products} />
            </Link>
        </div>
    );
}
