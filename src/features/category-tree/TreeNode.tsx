// outsource dependencies
import { cn } from "cn";
import { memo } from "react";
import { ChevronRight } from "lucide-react";

// local dependencies
import type { Category } from "../../domain";
import { ROOT, type ParentKey } from "./tree";
import { selectChildrenIndex } from "./selectors";
import { toggle, selectIsExpanded } from "./categoryTreeSlice";
import { useAppDispatch, useAppSelector } from "../../store/hooks";
import { useGetCategoriesQuery } from "../../api/endpoints/categories";

type Props = {
    id: Category["id"];
    level: number;
};

const EMPTY_IDS: Category["id"][] = [];

function TreeNodeInner({ id, level }: Props) {
    const dispatch = useAppDispatch();

    const { entity, childIds, posInSet, setSize } = useGetCategoriesQuery(
        undefined,
        {
            selectFromResult: ({ data }) => {
                const entity = data?.entities[id];
                const index: Map<ParentKey, Category["id"][]> = data
                    ? selectChildrenIndex(data)
                    : new Map();
                const childIds = index.get(id) ?? EMPTY_IDS;
                const parentKey = entity?.parentId ?? ROOT;
                const siblings = index.get(parentKey) ?? EMPTY_IDS;
                return {
                    entity,
                    childIds,
                    posInSet: siblings.indexOf(id) + 1,
                    setSize: siblings.length,
                };
            },
        },
    );

    const isExpanded = useAppSelector((state) => selectIsExpanded(state, id));

    if (!entity) return null;

    const hasChildren = childIds.length > 0;

    return (
        <li
            role="treeitem"
            aria-level={level}
            aria-setsize={setSize}
            aria-posinset={posInSet}
            aria-expanded={hasChildren ? isExpanded : undefined}
            className="flex flex-col"
        >
            <div
                className="flex h-8 items-center gap-1 rounded-sm pr-1 text-sm text-foreground"
                style={{ paddingLeft: `${(level - 1) * 18 + 4}px` }}
            >
                {hasChildren ? (
                    <button
                        type="button"
                        tabIndex={-1}
                        onClick={() => dispatch(toggle(id))}
                        className="shrink-0 text-muted-foreground"
                    >
                        <ChevronRight
                            aria-hidden="true"
                            className={cn(
                                "size-3.5 transition-transform",
                                isExpanded && "rotate-90",
                            )}
                        />
                    </button>
                ) : (
                    <span aria-hidden="true" className="size-3.5 shrink-0" />
                )}
                <span className="min-w-0 flex-1 truncate">{entity.name}</span>
                <span className="shrink-0 font-mono text-xs text-muted-foreground">
                    {entity.totalProductCount}
                </span>
            </div>
            {hasChildren && isExpanded && (
                <ul role="group">
                    {childIds.map((childId) => (
                        <TreeNode
                            key={childId}
                            id={childId}
                            level={level + 1}
                        />
                    ))}
                </ul>
            )}
        </li>
    );
}

export const TreeNode = memo(TreeNodeInner);
