// local dependencies
import type { Db } from "../../db";
import { ApiError, notFound } from "../errors";
import { moveCategory } from "../../../domain";
import type { MoveCategoryBody } from "../../../api/queries";
import type { CategoryWithCounts } from "../../../api/types";
import { buildChildrenMap, collectDescendantIds } from "../tree";

export function listCategories({ db }: { db: Db }): {
    body: CategoryWithCounts[];
} {
    const { categories, products } = db;
    const childrenMap = buildChildrenMap(categories);

    const directCount = new Map<string, number>();
    for (const p of products) {
        directCount.set(p.categoryId, (directCount.get(p.categoryId) ?? 0) + 1);
    }

    const sorted = [...categories].sort((a, b) => {
        if (a.parentId === null && b.parentId !== null) return -1;
        if (a.parentId !== null && b.parentId === null) return 1;
        if (a.parentId !== b.parentId) {
            return a.parentId!.localeCompare(b.parentId!);
        }
        return a.position - b.position;
    });

    const rows: CategoryWithCounts[] = sorted.map((cat) => {
        const descendants = collectDescendantIds(cat.id, childrenMap);
        let totalProductCount = 0;
        for (const p of products) {
            if (descendants.has(p.categoryId)) totalProductCount++;
        }
        return {
            ...cat,
            productCount: directCount.get(cat.id) ?? 0,
            totalProductCount,
        };
    });

    return { body: rows };
}

export function moveCategoryController({
    db,
    params,
    body,
}: {
    db: Db;
    params: Record<string, string>;
    body: MoveCategoryBody;
}): { status: 204 } {
    const result = moveCategory(db.categories, {
        id: params.id,
        parentId: body.parentId,
        index: body.index,
    });

    if (!result.ok) {
        switch (result.reason) {
            case "CATEGORY_NOT_FOUND":
                throw notFound("Category not found");
            case "PARENT_NOT_FOUND":
                throw notFound("Parent category not found");
            case "INTO_SELF_OR_DESCENDANT":
                throw new ApiError(
                    422,
                    "INVALID_MOVE",
                    "A category cannot be moved into itself or its descendant",
                    {
                        parentId:
                            "Cannot be the category itself or its descendant",
                    },
                );
            case "INDEX_OUT_OF_RANGE":
                throw new ApiError(
                    422,
                    "INVALID_MOVE",
                    "Index is out of range",
                    {
                        index: "Out of range for the target parent",
                    },
                );
            default: {
                const _never: never = result.reason;
                throw new Error(`Unhandled reason: ${String(_never)}`);
            }
        }
    }

    if (result.changes.length > 0) {
        db.transaction((draft) => {
            for (const change of result.changes) {
                const cat = draft.categories.find((c) => c.id === change.id);
                if (cat !== undefined) {
                    cat.parentId = change.parentId;
                    cat.position = change.position;
                }
            }
        });
    }

    return { status: 204 };
}
