// outsource dependencies
import { cn } from "cn";
import { Warehouse } from "lucide-react";

export function WarehouseLogo({ small }: { small?: boolean }) {
    return (
        <div className="flex items-center gap-2 group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:pr-2">
            <div
                className={cn(
                    "flex shrink-0 items-center justify-center rounded-sm bg-sidebar-primary",
                    small ? "size-7" : "size-8",
                )}
            >
                <Warehouse className="size-4 text-sidebar-primary-foreground" />
            </div>
            <span className="font-semibold group-data-[collapsible=icon]:hidden">
                Warehouse Manager
            </span>
        </div>
    );
}
