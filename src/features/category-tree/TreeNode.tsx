// outsource dependencies
import { cn } from "cn";
import { memo } from "react";
import { ChevronRight } from "lucide-react";

// local dependencies
import type { Category } from "../../domain";
import { selectChildrenIndex } from "./selectors";
import { useTreeSearch } from "./TreeSearchContext";
import { ROOT, splitByMatch, type ParentKey } from "./tree";
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

    const { entity, childIds, siblings } = useGetCategoriesQuery(undefined, {
        selectFromResult: ({ data }) => {
            const entity = data?.entities[id];
            const index: Map<ParentKey, Category["id"][]> = data
                ? selectChildrenIndex(data)
                : new Map();
            const childIds = index.get(id) ?? EMPTY_IDS;
            const parentKey: ParentKey = entity?.parentId ?? ROOT;
            const siblings = index.get(parentKey) ?? EMPTY_IDS;
            return { entity, childIds, siblings };
        },
    });

    const isExpanded = useAppSelector((state) => selectIsExpanded(state, id));
    const { query, visible } = useTreeSearch();
    const isSearchActive = query !== "";

    if (!entity) return null;

    const visibleChildIds = isSearchActive
        ? childIds.filter((cid) => visible.has(cid))
        : childIds;
    const displayHasChildren = visibleChildIds.length > 0;
    const effectiveExpanded = isSearchActive ? displayHasChildren : isExpanded;

    const visibleSiblings = isSearchActive
        ? siblings.filter((sid) => visible.has(sid))
        : siblings;
    const posInSet = visibleSiblings.indexOf(id) + 1;
    const setSize = visibleSiblings.length;

    return (
        <li
            role="treeitem"
            aria-level={level}
            aria-setsize={setSize}
            aria-posinset={posInSet}
            aria-expanded={displayHasChildren ? effectiveExpanded : undefined}
            className="flex flex-col"
        >
            <div
                className="flex h-8 items-center gap-1 rounded-sm pr-1 text-sm text-foreground"
                style={{ paddingLeft: `${(level - 1) * 18 + 4}px` }}
            >
                {displayHasChildren ? (
                    <button
                        type="button"
                        tabIndex={-1}
                        onClick={
                            isSearchActive
                                ? undefined
                                : () => dispatch(toggle(id))
                        }
                        className="shrink-0 text-muted-foreground"
                    >
                        <ChevronRight
                            aria-hidden="true"
                            className={cn(
                                "size-3.5 transition-transform",
                                effectiveExpanded && "rotate-90",
                            )}
                        />
                    </button>
                ) : (
                    <span aria-hidden="true" className="size-3.5 shrink-0" />
                )}
                <span className="min-w-0 flex-1 truncate">
                    {isSearchActive
                        ? splitByMatch(entity.name, query).map((seg, i) =>
                              seg.match ? (
                                  <mark
                                      key={i}
                                      className="rounded-[2px] bg-accent px-px font-semibold text-accent-foreground"
                                  >
                                      {seg.text}
                                  </mark>
                              ) : (
                                  <span key={i}>{seg.text}</span>
                              ),
                          )
                        : entity.name}
                </span>
                <span className="shrink-0 font-mono text-xs text-muted-foreground">
                    {entity.totalProductCount}
                </span>
            </div>
            {displayHasChildren && effectiveExpanded && (
                <ul role="group">
                    {visibleChildIds.map((childId) => (
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
