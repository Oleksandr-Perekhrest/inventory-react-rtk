// outsource dependencies
import { cn } from "cn";

// local dependencies
import type { MovementType } from "@/domain";

const BADGE_CLASS =
    "rounded-sm px-1 font-mono text-[11px] font-semibold uppercase tracking-wider";

const TYPE_COLORS: Record<MovementType, string> = {
    receipt: "bg-primary text-primary-foreground",
    shipment: "bg-secondary text-secondary-foreground",
    "write-off": "bg-stock-out text-stock-out-foreground",
    adjustment: "bg-warning text-warning-foreground",
};

export function MovementTypeBadge({ type }: { type: MovementType }) {
    return <span className={cn(BADGE_CLASS, TYPE_COLORS[type])}>{type}</span>;
}
