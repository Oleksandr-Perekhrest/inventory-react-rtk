// outsource dependencies
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/receiving")({
    component: ReceivingPage,
});

function ReceivingPage() {
    return (
        <div className="p-6">
            <h1 className="text-2xl font-semibold">Receiving</h1>
            <p className="text-muted-foreground">
                Record incoming stock shipments.
            </p>
        </div>
    );
}
