// outsource dependencies
import { Toaster as Sonner } from "sonner";
import type { CSSProperties, ComponentProps } from "react";

// local dependencies
import { useMediaQuery } from "@/hooks/use-media-query";

interface SonnerCSSVars extends CSSProperties {
    "--normal-bg"?: string;
    "--normal-text"?: string;
    "--normal-border"?: string;
}

const toasterStyle: SonnerCSSVars = {
    "--normal-bg": "var(--popover)",
    "--normal-text": "var(--popover-foreground)",
    "--normal-border": "var(--border)",
};

const MOBILE_NAV_OFFSET = "calc(4rem + env(safe-area-inset-bottom) + 1rem)";

export function Toaster(props: ComponentProps<typeof Sonner>) {
    const isLg = useMediaQuery("(min-width: 1024px)");
    return (
        <Sonner
            theme="light"
            position="bottom-right"
            className="font-sans"
            style={toasterStyle}
            toastOptions={{
                classNames: {
                    toast: "rounded-sm font-sans",
                },
            }}
            offset={isLg ? undefined : { bottom: MOBILE_NAV_OFFSET }}
            mobileOffset={{ bottom: MOBILE_NAV_OFFSET }}
            {...props}
        />
    );
}
