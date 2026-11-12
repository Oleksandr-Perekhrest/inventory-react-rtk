// outsource dependencies
import { useCallback } from "react";
import { getRouteApi } from "@tanstack/react-router";

// local dependencies
import type { Category } from "@/domain";
import { applySearchPatch } from "@/lib/search";
import { toProductsParams } from "./catalogSearch";
import type { CatalogSearch } from "./catalogSearch";
import { useGetProductsQuery } from "@/api/endpoints/products";

const routeApi = getRouteApi("/catalog");

export function useCatalogSearch() {
    const navigate = routeApi.useNavigate();
    const search = routeApi.useSearch();

    const updateSearch = useCallback(
        (patch: Partial<CatalogSearch>, options?: { replace?: boolean }) => {
            navigate({
                search: (prev) => applySearchPatch(prev, patch),
                replace: options?.replace,
            });
        },
        [navigate],
    );

    return { search, updateSearch };
}

export function useCatalogProducts() {
    const { search } = useCatalogSearch();
    return useGetProductsQuery(toProductsParams(search));
}

export function useIsCategorySelected(id: Category["id"]) {
    return routeApi.useSearch({ select: (s) => s.categoryId === id });
}

export function useSelectedCategoryId() {
    return routeApi.useSearch({ select: (s) => s.categoryId });
}

export function useSelectCategory() {
    const navigate = routeApi.useNavigate();
    return useCallback(
        (id: string | undefined) => {
            navigate({
                search: (prev) => ({ ...prev, categoryId: id, page: 1 }),
            });
        },
        [navigate],
    );
}
