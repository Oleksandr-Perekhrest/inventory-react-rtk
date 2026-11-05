// outsource dependencies
import { Plus } from "lucide-react";

// local dependencies
import { Button } from "@/components/ui/button";
import { CategoryPanel } from "./CategoryPanel";

export function DesignPreviewPage() {
    return (
        <div className="flex flex-col gap-6 p-6">
            <div className="flex flex-wrap items-center justify-between gap-4">
                <nav aria-label="Breadcrumb">
                    <ol className="flex items-center gap-1 font-mono text-xs uppercase tracking-wide text-muted-foreground">
                        <li>Catalog</li>
                        <li aria-hidden="true">›</li>
                        <li>Food & Beverages</li>
                        <li aria-hidden="true">›</li>
                        <li className="font-semibold text-foreground">Dairy</li>
                    </ol>
                </nav>
                <Button>
                    <Plus />
                    New receiving
                </Button>
            </div>
            <div className="flex flex-wrap gap-4">
                <CategoryPanel />
                <div className="min-w-0 flex-1">
                    <h1 className="text-2xl font-semibold">Dairy</h1>
                    <p className="font-mono text-xs uppercase text-muted-foreground">
                        24 SKU · 3 BELOW MIN
                    </p>
                </div>
            </div>
        </div>
    );
}
