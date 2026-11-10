// local dependencies
import { CategoryTree } from "./CategoryTree";
import { ProductsTable } from "../products-table/ProductsTable";
import { ProductsTableHeader } from "../products-table/ProductsTableHeader";

export function CatalogPage() {
    return (
        <div className="p-6">
            <h1 className="mb-6 text-2xl font-semibold">Catalog</h1>
            <div className="flex items-start gap-4">
                <CategoryTree />
                <div className="flex min-w-0 flex-1 flex-col gap-3">
                    <ProductsTableHeader />
                    <ProductsTable />
                </div>
            </div>
        </div>
    );
}
