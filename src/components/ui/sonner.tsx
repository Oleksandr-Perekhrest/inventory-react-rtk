// outsource dependencies
import { Toaster as Sonner } from "sonner";
import type { CSSProperties, ComponentProps } from "react";

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

export function Toaster(props: ComponentProps<typeof Sonner>) {
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
            mobileOffset={{
                bottom: "calc(4rem + env(safe-area-inset-bottom))",
            }}
            {...props}
        />
    );
}
