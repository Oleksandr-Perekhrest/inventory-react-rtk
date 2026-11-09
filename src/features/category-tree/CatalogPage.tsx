// local dependencies
import { CategoryTree } from "./CategoryTree";

export function CatalogPage() {
    return (
        <div className="p-6">
            <h1 className="mb-6 text-2xl font-semibold">Catalog</h1>
            <div className="flex items-start gap-4">
                <CategoryTree />
                <div className="flex-1 rounded-sm border bg-card p-4 text-sm text-muted-foreground">
                    Product table — coming in stage 4
                </div>
            </div>
        </div>
    );
}
