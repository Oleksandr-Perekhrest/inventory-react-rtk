// outsource dependencies
import { ChevronLeft, ChevronRight } from "lucide-react";

// local dependencies
import { useSidebar } from "@/components/ui/sidebar";

const iconClass =
    "size-3 text-sidebar-foreground/70 transition-all duration-150 motion-reduce:transition-none group-hover/toggle:size-4 group-hover/toggle:text-sidebar-accent-foreground group-focus-visible/toggle:size-4 group-focus-visible/toggle:text-sidebar-accent-foreground";

export function SidebarEdgeToggle() {
    const { state, toggleSidebar } = useSidebar();
    const isCollapsed = state === "collapsed";
    const label = isCollapsed ? "Expand sidebar" : "Collapse sidebar";

    return (
        <button
            type="button"
            onClick={toggleSidebar}
            aria-label={label}
            aria-expanded={!isCollapsed}
            className="group/toggle absolute inset-y-0 -right-3 z-20 hidden w-3 cursor-pointer items-center justify-center transition-all duration-150 hover:bg-sidebar-accent/20 focus-visible:bg-sidebar-accent/20 focus-visible:outline-none motion-reduce:transition-none md:flex"
        >
            <div className="flex h-10 w-3 items-center justify-center rounded-r-sm border-t border-r border-b border-sidebar-border bg-sidebar transition-all duration-150 motion-reduce:transition-none group-focus-visible/toggle:ring-2 group-focus-visible/toggle:ring-sidebar-ring">
                {isCollapsed ? (
                    <ChevronRight className={iconClass} />
                ) : (
                    <ChevronLeft className={iconClass} />
                )}
            </div>
            <span
                role="tooltip"
                className="pointer-events-none absolute left-full top-1/2 ml-2 -translate-y-1/2 whitespace-nowrap rounded-md bg-foreground px-3 py-1.5 text-xs text-background opacity-0 transition-opacity duration-150 motion-reduce:transition-none group-hover/toggle:opacity-100 group-focus-visible/toggle:opacity-100"
            >
                {label}
            </span>
        </button>
    );
}
