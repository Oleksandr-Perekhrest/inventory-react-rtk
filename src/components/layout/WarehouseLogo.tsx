// outsource dependencies
import { cn } from "cn";
import { Warehouse } from "lucide-react";

export function WarehouseMark({ small }: { small?: boolean }) {
    return (
        <div
            className={cn(
                "flex shrink-0 items-center justify-center rounded-sm bg-sidebar-primary",
                small ? "size-7" : "size-8",
            )}
        >
            <Warehouse className="size-4 text-sidebar-primary-foreground" />
        </div>
    );
}

export function WarehouseLogo({ small }: { small?: boolean }) {
    return (
        <div className="flex items-center gap-2 group-data-[collapsible=icon]:justify-center">
            <WarehouseMark small={small} />
            <span className="font-semibold group-data-[collapsible=icon]:hidden">
                Warehouse Manager
            </span>
        </div>
    );
}
