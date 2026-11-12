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
    link?: { search?: { stock: "low" | "out" } };
};

function MetricCard({ label, value, link }: MetricCardProps) {
    const card = (
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

    if (link === undefined) {
        return card;
    }

    if (link.search !== undefined) {
        return (
            <Link to="/catalog" search={link.search} className={LINK_CLASS}>
                {card}
            </Link>
        );
    }

    return (
        <Link to="/catalog" className={LINK_CLASS}>
            {card}
        </Link>
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
            <MetricCard
                label="Low stock"
                value={values.lowStock}
                link={{ search: { stock: "low" } }}
            />
            <MetricCard
                label="Out of stock"
                value={values.outOfStock}
                link={{ search: { stock: "out" } }}
            />
            <MetricCard label="Products" value={values.products} link={{}} />
        </div>
    );
}
