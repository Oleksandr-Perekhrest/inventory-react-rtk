// outsource dependencies
import { useRef, useEffect } from "react";
import {
    Link,
    useRouter,
    type ErrorComponentProps,
} from "@tanstack/react-router";

// local dependencies
import { Button } from "@/components/ui/button";

export function RouteError({ error, reset }: ErrorComponentProps) {
    const router = useRouter();
    const h1Ref = useRef<HTMLHeadingElement>(null);

    useEffect(() => {
        h1Ref.current?.focus();
    }, []);

    function handleReset() {
        reset();
        router.invalidate();
    }

    return (
        <div className="flex flex-col items-center justify-center gap-4 p-8">
            <h1
                ref={h1Ref}
                tabIndex={-1}
                className="font-mono text-lg font-semibold outline-none"
            >
                Something went wrong
            </h1>
            <p className="text-sm text-muted-foreground">
                The page failed to render — your demo data is safe in this
                browser.
            </p>
            <details className="w-full max-w-md rounded-sm border border-border bg-muted p-3 text-sm">
                <summary className="cursor-pointer font-mono text-muted-foreground">
                    Error details
                </summary>
                <pre className="mt-2 whitespace-pre-wrap break-words font-mono text-xs text-foreground">
                    {error instanceof Error ? error.message : String(error)}
                </pre>
            </details>
            <div className="flex gap-2">
                <Button variant="default" size="sm" onClick={handleReset}>
                    Try again
                </Button>
                <Button variant="outline" size="sm" asChild>
                    <Link to="/catalog">Go to catalog</Link>
                </Button>
            </div>
        </div>
    );
}
