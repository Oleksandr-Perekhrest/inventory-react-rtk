// outsource dependencies
import { ChevronLeft, ChevronRight } from "lucide-react";

// local dependencies
import { useSidebar } from "@/components/ui/sidebar";
import {
    Tooltip,
    TooltipContent,
    TooltipTrigger,
} from "@/components/ui/tooltip";

const chevronClass =
    "size-6 text-sidebar-primary transition-[width,height,color] duration-150 motion-reduce:transition-none group-hover/toggle:size-7 group-hover/toggle:text-sidebar-primary-foreground group-focus-visible/toggle:size-7 group-focus-visible/toggle:text-sidebar-primary-foreground";

export function SidebarEdgeToggle() {
    const { state, toggleSidebar } = useSidebar();
    const isCollapsed = state === "collapsed";
    const label = isCollapsed ? "Expand sidebar" : "Collapse sidebar";

    return (
        <Tooltip>
            <TooltipTrigger asChild>
                <button
                    type="button"
                    onClick={toggleSidebar}
                    aria-label={label}
                    aria-expanded={!isCollapsed}
                    className="group/toggle absolute inset-y-0 right-0 z-20 hidden w-7 cursor-pointer items-center justify-center transition-colors duration-150 hover:bg-sidebar-primary focus-visible:bg-sidebar-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sidebar-ring motion-reduce:transition-none lg:flex"
                >
                    {isCollapsed ? (
                        <ChevronRight className={chevronClass} />
                    ) : (
                        <ChevronLeft className={chevronClass} />
                    )}
                </button>
            </TooltipTrigger>
            <TooltipContent side="right">{label}</TooltipContent>
        </Tooltip>
    );
}
