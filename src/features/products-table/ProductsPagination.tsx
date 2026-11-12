// outsource dependencies
import { useEffect } from "react";

// local dependencies
import { productsApi } from "@/api/endpoints/products";
import { TablePagination } from "@/components/TablePagination";
import { toProductsParams } from "@/features/catalog/catalogSearch";
import {
    useCatalogSearch,
    useCatalogProducts,
} from "@/features/catalog/useCatalogSearch";

export function ProductsPagination() {
    const { search, updateSearch } = useCatalogSearch();
    const { data } = useCatalogProducts();
    const prefetchProducts = productsApi.usePrefetch("getProducts");

    const total = data?.total ?? 0;
    const { page, pageSize } = search;

    // Redirect to last valid page when current page is out of bounds
    useEffect(() => {
        if (!data || data.total === 0) return;
        const computedLast = Math.ceil(data.total / search.pageSize);
        if (search.page > computedLast) {
            updateSearch({ page: computedLast }, { replace: true });
        }
    }, [data, search.page, search.pageSize, updateSearch]);

    return (
        <TablePagination
            page={page}
            pageSize={pageSize}
            total={total}
            onPageChange={(p) => updateSearch({ page: p })}
            onPageSizeChange={(size) => updateSearch({ pageSize: size })}
            onPrefetchPage={(p) =>
                prefetchProducts(toProductsParams({ ...search, page: p }))
            }
        />
    );
}
