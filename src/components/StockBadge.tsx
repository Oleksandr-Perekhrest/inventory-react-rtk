// local dependencies
import type { StockStatus } from "@/domain";

export function StockBadge({ status }: { status: StockStatus }) {
    if (status === "out") {
        return (
            <span className="rounded-sm bg-stock-out px-1 font-mono text-[11px] font-semibold uppercase tracking-wider text-stock-out-foreground">
                Out
            </span>
        );
    }
    if (status === "low") {
        return (
            <span className="rounded-sm bg-warning px-1 font-mono text-[11px] font-semibold uppercase tracking-wider text-warning-foreground">
                Low
            </span>
        );
    }
    return null;
}
