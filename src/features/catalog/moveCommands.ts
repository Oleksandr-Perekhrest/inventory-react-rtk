// outsource dependencies
import { toast } from "sonner";
import { useCallback } from "react";
import type { EntityState } from "@reduxjs/toolkit";

// local dependencies
import type { CategoryWithCounts } from "@/api/types";
import { productsApi } from "@/api/endpoints/products";
import type { AppStore, AppDispatch } from "@/store/store";
import { categoriesApi } from "@/api/endpoints/categories";
import { useAppStore, useAppDispatch } from "@/store/hooks";
import { isApiErrorData, getErrorMessage } from "@/api/errors";
import { describeCategoryMove } from "@/features/category-tree/dnd";
import type { Product, Category, MoveCategoryInput } from "@/domain";
import { expandMany } from "@/features/category-tree/categoryTreeSlice";
import {
    ROOT,
    collectAncestors,
    buildChildrenIndex,
} from "@/features/category-tree/tree";

async function notifyMoveResult(
    promise: Promise<unknown>,
    { name, destination }: { name: string; destination: string },
) {
    try {
        await promise;
        toast.success(`Moved "${name}" to ${destination}`, { duration: 3000 });
    } catch (error) {
        toast.error(`Couldn't move "${name}"`, {
            description: `Changes were reverted. ${getErrorMessage(isApiErrorData(error) ? error : undefined)}`,
            duration: 6000,
        });
    }
}

export async function executeCategoryMove(
    store: AppStore,
    dispatch: AppDispatch,
    input: MoveCategoryInput,
): Promise<void> {
    const categories = categoriesApi.endpoints.getCategories.select()(
        store.getState(),
    ).data;
    const { name, destination } = describeCategoryMove(categories, input);

    if (input.parentId !== null) {
        const ancestors = categories
            ? collectAncestors(categories, new Set([input.parentId]))
            : new Set<Category["id"]>();
        const toExpand: Category["id"][] = [input.parentId];
        for (const id of ancestors) {
            toExpand.push(id);
        }
        dispatch(expandMany(toExpand));
    }

    await notifyMoveResult(
        dispatch(categoriesApi.endpoints.moveCategory.initiate(input)).unwrap(),
        { name, destination },
    );
}

export async function executeProductMove(
    store: AppStore,
    dispatch: AppDispatch,
    move: { id: Product["id"]; categoryId: Category["id"]; name: string },
): Promise<void> {
    const categories = categoriesApi.endpoints.getCategories.select()(
        store.getState(),
    ).data;
    const categoryName =
        categories?.entities[move.categoryId]?.name ?? move.categoryId;

    await notifyMoveResult(
        dispatch(
            productsApi.endpoints.updateProduct.initiate({
                id: move.id,
                categoryId: move.categoryId,
            }),
        ).unwrap(),
        { name: move.name, destination: `"${categoryName}"` },
    );
}

export function categoryMoveToEnd(
    data: EntityState<CategoryWithCounts, Category["id"]>,
    categoryId: Category["id"],
    parentId: Category["id"] | null,
): MoveCategoryInput {
    const index = buildChildrenIndex(data);
    const parentKey = parentId ?? ROOT;
    const siblings = (index.get(parentKey) ?? []).filter(
        (id) => id !== categoryId,
    );
    return { id: categoryId, parentId, index: siblings.length };
}

export function useMoveCommands() {
    const store = useAppStore();
    const dispatch = useAppDispatch();

    const moveCategory = useCallback(
        (input: MoveCategoryInput): Promise<void> =>
            executeCategoryMove(store, dispatch, input),
        [store, dispatch],
    );

    const moveProduct = useCallback(
        (move: {
            id: Product["id"];
            categoryId: Category["id"];
            name: string;
        }): Promise<void> => executeProductMove(store, dispatch, move),
        [store, dispatch],
    );

    return { moveCategory, moveProduct };
}
