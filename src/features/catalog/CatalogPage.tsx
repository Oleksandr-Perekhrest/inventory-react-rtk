// local dependencies
import { CategoryTree } from "@/features/category-tree/CategoryTree";
import { ProductsTable } from "@/features/products-table/ProductsTable";
import { ProductsToolbar } from "@/features/products-table/ProductsToolbar";
import { ProductsPagination } from "@/features/products-table/ProductsPagination";
import { ProductsTableHeader } from "@/features/products-table/ProductsTableHeader";

export function CatalogPage() {
    return (
        <div className="p-6">
            <h1 className="mb-6 text-2xl font-semibold">Catalog</h1>
            <div className="flex items-start gap-4">
                <CategoryTree />
                <div className="flex min-w-0 flex-1 flex-col gap-3">
                    <ProductsTableHeader />
                    <ProductsToolbar />
                    <ProductsTable />
                    <ProductsPagination />
                </div>
            </div>
        </div>
    );
}
