// outsource dependencies
import { toast } from "sonner";
import { useCallback, type ReactNode } from "react";
import {
    Accessibility,
    type defaultPreset,
    PointerActivationConstraints,
} from "@dnd-kit/dom";
import {
    DragOverlay,
    PointerSensor,
    DragDropProvider,
    type DragEndEvent,
    type DragMoveEvent,
} from "@dnd-kit/react";

// local dependencies
import { productsApi } from "@/api/endpoints/products";
import { categoriesApi } from "@/api/endpoints/categories";
import { useAppStore, useAppDispatch } from "@/store/hooks";
import { isApiErrorData, getErrorMessage } from "@/api/errors";
import type { AppStore, RootState, AppDispatch } from "@/store/store";
import {
    expandMany,
    setDropIndicator,
} from "@/features/category-tree/categoryTreeSlice";
import {
    getDropZone,
    type DropZone,
    isProductDndData,
    isCategoryDndData,
    resolveProductDrop,
    resolveCategoryDrop,
    describeCategoryMove,
} from "@/features/category-tree/dnd";

// The Accessibility plugin adds role="button", tabindex="0" and keyboard
// instructions to every draggable, which breaks the ARIA tree (roving
// tabindex, no interactive children in treeitem); announcements are handled
// by the tree itself in a later step.
type PluginList = (typeof defaultPreset)["plugins"];

const noAccessibilityPlugins = (defaults: PluginList): PluginList =>
    defaults.filter((plugin) => plugin !== Accessibility);

const sensors = [
    PointerSensor.configure({
        activationConstraints(event) {
            if (event.pointerType === "touch") {
                return [
                    new PointerActivationConstraints.Delay({
                        value: 250,
                        tolerance: 5,
                    }),
                ];
            }
            return [new PointerActivationConstraints.Distance({ value: 6 })];
        },
    }),
];

function DragChip({ children }: { children: ReactNode }) {
    return (
        <div className="flex h-8 items-center rounded-sm border bg-card px-2 text-sm font-sans shadow-md">
            {children}
        </div>
    );
}

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

function computeCategoryDrop(
    operation: DragMoveEvent["operation"],
    state: RootState,
) {
    const { source, target, position } = operation;
    if (!source || !target) return null;

    const rect = target.shape?.boundingRectangle;
    if (!rect) return null;

    const sourceData = source.data;
    const targetData = target.data;
    if (!isCategoryDndData(sourceData) || !isCategoryDndData(targetData)) {
        return null;
    }

    const zone = getDropZone(position.current.y, rect);
    const categories =
        categoriesApi.endpoints.getCategories.select()(state).data;
    if (!categories) return null;

    const targetExpanded = !!state.categoryTree.expanded[targetData.categoryId];

    const resolved = resolveCategoryDrop(categories, {
        draggedId: sourceData.categoryId,
        targetId: targetData.categoryId,
        zone,
        targetExpanded,
    });

    return resolved
        ? { resolved, zone, targetId: targetData.categoryId }
        : null;
}

function computeProductDrop(operation: DragMoveEvent["operation"]) {
    const { source, target } = operation;
    if (!source || !target) return null;

    const sourceData = source.data;
    const targetData = target.data;
    if (!isProductDndData(sourceData) || !isCategoryDndData(targetData)) {
        return null;
    }

    const resolved = resolveProductDrop(sourceData, targetData.categoryId);
    return resolved
        ? { resolved, targetId: targetData.categoryId, name: sourceData.name }
        : null;
}

function indicatorFor(
    operation: DragMoveEvent["operation"],
    state: RootState,
): { targetId: string; zone: DropZone } | null {
    const source = operation.source;
    if (!source) return null;
    if (source.type === "product") {
        const result = computeProductDrop(operation);
        return result ? { targetId: result.targetId, zone: "inside" } : null;
    }
    const result = computeCategoryDrop(operation, state);
    return result ? { targetId: result.targetId, zone: result.zone } : null;
}

async function runProductDrop(
    operation: DragMoveEvent["operation"],
    store: AppStore,
    dispatch: AppDispatch,
) {
    const result = computeProductDrop(operation);
    if (!result) return;

    const categories = categoriesApi.endpoints.getCategories.select()(
        store.getState(),
    ).data;
    const categoryName =
        categories?.entities[result.targetId]?.name ?? result.targetId;

    await notifyMoveResult(
        dispatch(
            productsApi.endpoints.updateProduct.initiate(result.resolved),
        ).unwrap(),
        { name: result.name, destination: `"${categoryName}"` },
    );
}

async function runCategoryDrop(
    operation: DragMoveEvent["operation"],
    store: AppStore,
    dispatch: AppDispatch,
) {
    const result = computeCategoryDrop(operation, store.getState());
    if (!result) return;

    const categories = categoriesApi.endpoints.getCategories.select()(
        store.getState(),
    ).data;
    const { name, destination } = describeCategoryMove(
        categories,
        result.resolved,
    );

    if (result.resolved.parentId === result.targetId) {
        dispatch(expandMany([result.targetId]));
    }

    await notifyMoveResult(
        dispatch(
            categoriesApi.endpoints.moveCategory.initiate(result.resolved),
        ).unwrap(),
        { name, destination },
    );
}

export function CatalogDndProvider({ children }: { children: ReactNode }) {
    const dispatch = useAppDispatch();
    const store = useAppStore();

    const handleDragMove = useCallback(
        (event: DragMoveEvent) => {
            dispatch(
                setDropIndicator(
                    indicatorFor(event.operation, store.getState()),
                ),
            );
        },
        [dispatch, store],
    );

    const handleDragEnd = useCallback(
        async (event: DragEndEvent) => {
            dispatch(setDropIndicator(null));
            if (event.canceled || !event.operation.target) return;
            const source = event.operation.source;
            if (!source) return;
            if (source.type === "product") {
                await runProductDrop(event.operation, store, dispatch);
            } else {
                await runCategoryDrop(event.operation, store, dispatch);
            }
        },
        [dispatch, store],
    );

    return (
        <DragDropProvider
            sensors={sensors}
            plugins={noAccessibilityPlugins}
            onDragMove={handleDragMove}
            onDragEnd={handleDragEnd}
        >
            {children}
            <DragOverlay dropAnimation={null}>
                {(source) => {
                    const data = source.data;
                    if (isProductDndData(data)) {
                        return <DragChip>{data.name}</DragChip>;
                    }
                    if (isCategoryDndData(data)) {
                        const name =
                            categoriesApi.endpoints.getCategories.select()(
                                store.getState(),
                            ).data?.entities[data.categoryId]?.name;
                        return name ? <DragChip>{name}</DragChip> : null;
                    }
                    return null;
                }}
            </DragOverlay>
        </DragDropProvider>
    );
}
