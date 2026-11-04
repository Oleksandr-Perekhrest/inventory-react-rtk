// outsource dependencies
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/catalog")({
    component: CatalogPage,
});

// eslint-disable-next-line react-refresh/only-export-components
function CatalogPage() {
    return (
        <div className="p-6">
            <h1 className="text-2xl font-semibold">Catalog</h1>
            <p className="text-muted-foreground">Browse and manage products.</p>
        </div>
    );
}
