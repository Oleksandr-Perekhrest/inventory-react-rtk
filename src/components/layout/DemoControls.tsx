// outsource dependencies
import { useId, useState } from "react";
import { Wifi, WifiOff, RotateCcw } from "lucide-react";

// local dependencies
import { getErrorMessage } from "@/api/errors";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { useResetDemoMutation } from "@/api/endpoints/demo";
import { getErrorMode, setErrorMode } from "@/mocks/api/network";
import {
    SidebarMenu,
    SidebarMenuItem,
    SidebarMenuButton,
} from "@/components/ui/sidebar";
import {
    AlertDialog,
    AlertDialogTitle,
    AlertDialogCancel,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogContent,
    AlertDialogDescription,
} from "@/components/ui/alert-dialog";

const iconButtonClass =
    "[&_svg]:size-5 group-data-[collapsible=icon]:[&_svg]:size-6 group-data-[collapsible=icon]:size-11! group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:[&>span]:sr-only";

export function DemoControls() {
    const switchId = useId();
    const [dialogOpen, setDialogOpen] = useState(false);
    const [errorMode, setErrorModeState] = useState<"off" | "random">(
        getErrorMode,
    );
    const [resetDemo, { isLoading, error, reset }] = useResetDemoMutation();

    const handleErrorModeChange = (checked: boolean) => {
        const mode = checked ? "random" : "off";
        setErrorModeState(mode);
        setErrorMode(mode);
    };

    const handleReset = async () => {
        const result = await resetDemo();
        if (!("error" in result)) {
            setDialogOpen(false);
            reset();
        }
    };

    const handleDialogOpenChange = (open: boolean) => {
        if (!open && isLoading) return;
        if (!open) reset();
        setDialogOpen(open);
    };

    return (
        <>
            <AlertDialog
                open={dialogOpen}
                onOpenChange={handleDialogOpenChange}
            >
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Reset demo data?</AlertDialogTitle>
                        <AlertDialogDescription>
                            All changes will be replaced with fresh demo data.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    {error && (
                        <p role="alert" className="text-sm text-destructive">
                            {getErrorMessage(error)}
                        </p>
                    )}
                    <AlertDialogFooter>
                        <AlertDialogCancel disabled={isLoading}>
                            Cancel
                        </AlertDialogCancel>
                        <Button onClick={handleReset} disabled={isLoading}>
                            {isLoading ? "Resetting…" : "Reset"}
                        </Button>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>

            {/* Expanded layout — hidden in icon-collapsed sidebar */}
            <div className="group-data-[collapsible=icon]:hidden flex flex-col gap-3">
                <Button
                    variant="ghost"
                    size="sm"
                    className="w-full gap-2 border border-sidebar-foreground/40 text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground focus-visible:border-sidebar-ring focus-visible:ring-sidebar-ring"
                    onClick={() => setDialogOpen(true)}
                >
                    <RotateCcw className="size-4" />
                    Reset demo data
                </Button>
                <div className="flex items-start justify-between gap-3">
                    <div className="flex flex-col gap-0.5">
                        <label
                            htmlFor={switchId}
                            className="cursor-pointer text-sm text-sidebar-foreground"
                        >
                            Simulate network errors
                        </label>
                        <span className="text-xs text-sidebar-foreground/60">
                            About 1 in 5 requests fails
                        </span>
                    </div>
                    <Switch
                        id={switchId}
                        size="sm"
                        checked={errorMode === "random"}
                        onCheckedChange={handleErrorModeChange}
                        className="data-unchecked:bg-sidebar-foreground/40 data-checked:bg-sidebar-primary focus-visible:border-sidebar-ring focus-visible:ring-sidebar-ring"
                    />
                </div>
            </div>

            {/* Collapsed icon buttons — shown only in icon-collapsed sidebar */}
            <div className="hidden group-data-[collapsible=icon]:block">
                <SidebarMenu>
                    <SidebarMenuItem>
                        <SidebarMenuButton
                            tooltip="Reset demo data"
                            onClick={() => setDialogOpen(true)}
                            className={iconButtonClass}
                        >
                            <RotateCcw />
                            <span>Reset demo data</span>
                        </SidebarMenuButton>
                    </SidebarMenuItem>
                    <SidebarMenuItem>
                        <SidebarMenuButton
                            tooltip="Simulate network errors"
                            aria-pressed={errorMode === "random"}
                            onClick={() =>
                                handleErrorModeChange(errorMode !== "random")
                            }
                            className={iconButtonClass}
                        >
                            {errorMode === "random" ? <WifiOff /> : <Wifi />}
                            <span>Simulate network errors</span>
                        </SidebarMenuButton>
                    </SidebarMenuItem>
                </SidebarMenu>
            </div>
        </>
    );
}
