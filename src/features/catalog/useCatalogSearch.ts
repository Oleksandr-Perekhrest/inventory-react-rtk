// outsource dependencies
import { getRouteApi } from "@tanstack/react-router";

// local dependencies
import { toProductsParams } from "./catalogSearch";
import type { CatalogSearch } from "./catalogSearch";
import { useGetProductsQuery } from "../../api/endpoints/products";

const routeApi = getRouteApi("/catalog");

export function useCatalogSearch() {
    const navigate = routeApi.useNavigate();
    const search = routeApi.useSearch();

    function updateSearch(
        patch: Partial<CatalogSearch>,
        options?: { replace?: boolean },
    ) {
        const resetsPage = Object.keys(patch).some((k) => k !== "page");
        navigate({
            search: (prev) => ({
                ...prev,
                ...patch,
                ...(resetsPage ? { page: 1 } : {}),
            }),
            replace: options?.replace,
        });
    }

    return { search, updateSearch };
}

export function useCatalogProducts() {
    const { search } = useCatalogSearch();
    return useGetProductsQuery(toProductsParams(search));
}
