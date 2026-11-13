// outsource dependencies
import { Bar, XAxis, YAxis, BarChart, CartesianGrid } from "recharts";

// local dependencies
import { getErrorMessage } from "@/api/errors";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { formatPrice } from "@/features/products-table/helpers";
import { useGetDashboardQuery } from "@/api/endpoints/dashboard";
import { Card, CardHeader, CardContent } from "@/components/ui/card";
import {
    ChartLegend,
    ChartTooltip,
    ChartContainer,
    type ChartConfig,
    ChartLegendContent,
    ChartTooltipContent,
} from "@/components/ui/chart";

const chartConfig = {
    inflow: {
        label: "Inflow",
        color: "var(--chart-1)",
    },
    outflow: {
        label: "Outflow",
        color: "var(--chart-2)",
    },
} satisfies ChartConfig;

function parseLocalDate(dateStr: string): Date {
    const [y, m, d] = dateStr.split("-").map(Number);
    return new Date(y, m - 1, d);
}

const axisDateFormatter = new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    month: "short",
});

function formatAxisDate(dateStr: string): string {
    return axisDateFormatter.format(parseLocalDate(dateStr));
}

const tooltipDateFormatter = new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
});

function formatTooltipDate(dateStr: string): string {
    return tooltipDateFormatter.format(parseLocalDate(dateStr));
}

const compactFormatter = new Intl.NumberFormat("en-US", {
    notation: "compact",
    maximumFractionDigits: 1,
});

function formatYAxis(minorUnits: number): string {
    return `₴${compactFormatter.format(minorUnits / 100)}`;
}

export function FlowChart() {
    const { data, isLoading, isError, error, refetch } = useGetDashboardQuery();

    const totalInflow = data?.daily.reduce((sum, d) => sum + d.inflow, 0) ?? 0;
    const totalOutflow =
        data?.daily.reduce((sum, d) => sum + d.outflow, 0) ?? 0;

    return (
        <section>
            <Card className="rounded-sm">
                <CardHeader>
                    <div className="flex flex-wrap items-start justify-between gap-2">
                        <div>
                            <h2 className="text-base font-medium">
                                Inflow and outflow
                            </h2>
                            <p className="text-sm text-muted-foreground">
                                Last 30 days, at current prices
                            </p>
                        </div>
                        {data && (
                            <div className="flex gap-4 font-mono text-sm tabular-nums">
                                <span>
                                    <span
                                        className="mr-1 inline-block h-2 w-2 rounded-[2px]"
                                        style={{
                                            backgroundColor: "var(--chart-1)",
                                        }}
                                    />
                                    {formatPrice(totalInflow)}
                                </span>
                                <span>
                                    <span
                                        className="mr-1 inline-block h-2 w-2 rounded-[2px]"
                                        style={{
                                            backgroundColor: "var(--chart-2)",
                                        }}
                                    />
                                    {formatPrice(totalOutflow)}
                                </span>
                            </div>
                        )}
                    </div>
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
                        <Skeleton className="h-64 w-full rounded-sm lg:h-72" />
                    ) : (
                        <ChartContainer
                            config={chartConfig}
                            className="h-64 w-full lg:h-72"
                            role="img"
                            aria-label={`Inflow and outflow over the last 30 days: inflow ${formatPrice(totalInflow)}, outflow ${formatPrice(totalOutflow)}`}
                        >
                            <BarChart
                                data={data.daily}
                                margin={{
                                    top: 4,
                                    right: 0,
                                    bottom: 0,
                                    left: 0,
                                }}
                            >
                                <CartesianGrid vertical={false} />
                                <XAxis
                                    dataKey="date"
                                    tickFormatter={formatAxisDate}
                                    interval="preserveStartEnd"
                                    minTickGap={40}
                                    tickLine={false}
                                    axisLine={false}
                                    tick={{ fontSize: 12 }}
                                />
                                <YAxis
                                    tickFormatter={formatYAxis}
                                    tickLine={false}
                                    axisLine={false}
                                    tick={{ fontSize: 12 }}
                                    width={56}
                                />
                                <ChartTooltip
                                    content={
                                        <ChartTooltipContent
                                            labelFormatter={(label) =>
                                                typeof label === "string"
                                                    ? formatTooltipDate(label)
                                                    : label
                                            }
                                            formatter={(value, name) => {
                                                const cfg =
                                                    name === "inflow"
                                                        ? chartConfig.inflow
                                                        : name === "outflow"
                                                          ? chartConfig.outflow
                                                          : undefined;
                                                return (
                                                    <div className="flex w-full items-center justify-between gap-4">
                                                        <span className="text-muted-foreground">
                                                            {cfg?.label ?? name}
                                                        </span>
                                                        <span className="font-mono font-medium tabular-nums">
                                                            {formatPrice(
                                                                typeof value ===
                                                                    "number"
                                                                    ? value
                                                                    : 0,
                                                            )}
                                                        </span>
                                                    </div>
                                                );
                                            }}
                                        />
                                    }
                                />
                                <ChartLegend content={<ChartLegendContent />} />
                                <Bar
                                    dataKey="inflow"
                                    fill="var(--color-inflow)"
                                    radius={[2, 2, 0, 0]}
                                />
                                <Bar
                                    dataKey="outflow"
                                    fill="var(--color-outflow)"
                                    radius={[2, 2, 0, 0]}
                                />
                            </BarChart>
                        </ChartContainer>
                    )}
                </CardContent>
            </Card>
        </section>
    );
}
