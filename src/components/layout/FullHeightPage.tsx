// outsource dependencies
import type { ReactNode } from "react";

/**
 * Page layout that fills the visible height. Relies on SidebarInset being the
 * scroll container with a fixed height (h-dvh overflow-y-auto).
 */
export function FullHeightPage({
    header,
    children,
    footer,
}: {
    header: ReactNode;
    children: ReactNode;
    footer?: ReactNode;
}) {
    return (
        <div className="flex h-full min-h-0 flex-col gap-4 p-4 lg:p-6">
            <div>{header}</div>
            <div className="flex min-h-0 flex-1 flex-col">{children}</div>
            {footer !== undefined && <div>{footer}</div>}
        </div>
    );
}
