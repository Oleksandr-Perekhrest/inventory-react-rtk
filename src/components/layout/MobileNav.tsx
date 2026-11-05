// outsource dependencies
import { cn } from "cn";
import { X, Menu } from "lucide-react";
import { useId, useState } from "react";
import { Link } from "@tanstack/react-router";
import type { LucideIcon } from "lucide-react";
import type { LinkProps } from "@tanstack/react-router";

// local dependencies
import { navItems } from "@/components/layout/navItems";
import { useActiveNav } from "@/components/layout/useActiveNav";
import { WarehouseLogo } from "@/components/layout/WarehouseLogo";
import { Sheet, SheetTitle, SheetContent } from "@/components/ui/sheet";

function MobileNavLink({
    to,
    label,
    icon: Icon,
    onNavigate,
}: {
    to: LinkProps["to"];
    label: string;
    icon: LucideIcon;
    onNavigate: () => void;
}) {
    const isActive = useActiveNav(to);
    return (
        <Link
            to={to}
            onClick={onNavigate}
            className={cn(
                "flex h-14 w-full items-center gap-4 px-4 text-lg",
                isActive && "bg-sidebar-accent text-sidebar-accent-foreground",
            )}
            aria-current={isActive ? "page" : undefined}
        >
            <Icon className="size-7 shrink-0" />
            {label}
        </Link>
    );
}

export function MobileNav() {
    const [open, setOpen] = useState(false);
    const sheetId = useId();

    return (
        <>
            <div className="fixed inset-x-0 bottom-0 z-50 flex flex-col border-t border-sidebar-border bg-sidebar text-sidebar-foreground lg:hidden">
                <div className="flex h-16 items-center justify-between px-4">
                    <WarehouseLogo small />
                    <button
                        type="button"
                        onClick={() => setOpen(true)}
                        className="flex size-12 items-center justify-center rounded-sm"
                        aria-label="Open menu"
                        aria-expanded={open}
                        aria-controls={sheetId}
                    >
                        <Menu className="size-7" />
                    </button>
                </div>
                <div
                    className="shrink-0"
                    style={{ height: "env(safe-area-inset-bottom)" }}
                />
            </div>
            <Sheet open={open} onOpenChange={setOpen}>
                <SheetContent
                    id={sheetId}
                    side="bottom"
                    showCloseButton={false}
                    aria-describedby={undefined}
                    className="max-h-[80svh] gap-0 overflow-y-auto rounded-t-sm bg-sidebar p-0 text-sidebar-foreground"
                >
                    <SheetTitle className="sr-only">Navigation</SheetTitle>
                    {navItems.map((item) => (
                        <MobileNavLink
                            key={String(item.to)}
                            {...item}
                            onNavigate={() => setOpen(false)}
                        />
                    ))}
                    <div className="flex h-14 items-center justify-between px-4">
                        <WarehouseLogo small />
                        <button
                            type="button"
                            onClick={() => setOpen(false)}
                            className="flex size-12 items-center justify-center rounded-sm"
                            aria-label="Close menu"
                        >
                            <X className="size-7" />
                        </button>
                    </div>
                    <div
                        className="shrink-0"
                        style={{ height: "env(safe-area-inset-bottom)" }}
                    />
                </SheetContent>
            </Sheet>
        </>
    );
}
