// outsource dependencies
import { useCallback, type ReactNode } from "react";
import {
    DragOverlay,
    PointerSensor,
    DragDropProvider,
    type DragEndEvent,
    type DragMoveEvent,
} from "@dnd-kit/react";

// local dependencies
import type { RootState } from "@/store/store";
import { categoriesApi } from "@/api/endpoints/categories";
import { useAppStore, useAppDispatch } from "@/store/hooks";
import {
    expandMany,
    setDropIndicator,
} from "@/features/category-tree/categoryTreeSlice";
import {
    getDropZone,
    isCategoryDndData,
    resolveCategoryDrop,
} from "@/features/category-tree/dnd";

// PointerActivationConstraints is not re-exported by @dnd-kit/react (only in
// @dnd-kit/dom). Sensor configured without activation constraints.
const sensors = [PointerSensor.configure({})];

function computeDrop(operation: DragMoveEvent["operation"], state: RootState) {
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

export function CatalogDndProvider({ children }: { children: ReactNode }) {
    const dispatch = useAppDispatch();
    const store = useAppStore();

    const handleDragMove = useCallback(
        (event: DragMoveEvent) => {
            const result = computeDrop(event.operation, store.getState());
            dispatch(
                setDropIndicator(
                    result
                        ? { targetId: result.targetId, zone: result.zone }
                        : null,
                ),
            );
        },
        [dispatch, store],
    );

    const handleDragEnd = useCallback(
        (event: DragEndEvent) => {
            dispatch(setDropIndicator(null));
            if (event.canceled || !event.operation.target) return;
            const result = computeDrop(event.operation, store.getState());
            if (!result) return;
            void dispatch(
                categoriesApi.endpoints.moveCategory.initiate(result.resolved),
            );
            if (result.resolved.parentId === result.targetId) {
                dispatch(expandMany([result.targetId]));
            }
        },
        [dispatch, store],
    );

    return (
        <DragDropProvider
            sensors={sensors}
            onDragMove={handleDragMove}
            onDragEnd={handleDragEnd}
        >
            {children}
            <DragOverlay dropAnimation={null}>
                {(source) => {
                    const data = source.data;
                    if (!isCategoryDndData(data)) return null;
                    const name = categoriesApi.endpoints.getCategories.select()(
                        store.getState(),
                    ).data?.entities[data.categoryId]?.name;
                    return name ? (
                        <div className="flex h-8 items-center rounded-sm border bg-card px-2 text-sm font-sans shadow-md">
                            {name}
                        </div>
                    ) : null;
                }}
            </DragOverlay>
        </DragDropProvider>
    );
}
