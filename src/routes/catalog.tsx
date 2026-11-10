// outsource dependencies
import { createFileRoute, stripSearchParams } from "@tanstack/react-router";

// local dependencies
import { productsApi } from "../api/endpoints/products";
import { CatalogPage } from "../features/catalog/CatalogPage";
import {
    toProductsParams,
    catalogSearchSchema,
    CATALOG_SEARCH_DEFAULTS,
} from "../features/catalog/catalogSearch";

export const Route = createFileRoute("/catalog")({
    validateSearch: catalogSearchSchema,
    search: {
        middlewares: [stripSearchParams(CATALOG_SEARCH_DEFAULTS)],
    },
    loaderDeps: ({ search }) => search,
    loader: ({ context, deps }) => {
        context.store.dispatch(
            productsApi.util.prefetch(
                "getProducts",
                toProductsParams(deps),
                {},
            ),
        );
    },
    component: CatalogPage,
});
