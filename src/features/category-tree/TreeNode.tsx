// outsource dependencies
import { cn } from "cn";
import { ChevronRight } from "lucide-react";
import { memo, useRef, useEffect } from "react";

// local dependencies
import type { Category } from "../../domain";
import { selectChildrenIndex } from "./selectors";
import { useTreeSearch } from "./TreeSearchContext";
import { ROOT, splitByMatch, type ParentKey } from "./tree";
import { useAppDispatch, useAppSelector } from "../../store/hooks";
import { useIsCategorySelected } from "../catalog/useCatalogSearch";
import { useGetCategoriesQuery } from "../../api/endpoints/categories";
import {
    toggle,
    setFocused,
    selectIsFocused,
    selectIsExpanded,
} from "./categoryTreeSlice";

type Props = {
    id: Category["id"];
    level: number;
};

const EMPTY_IDS: Category["id"][] = [];

function TreeNodeInner({ id, level }: Props) {
    const dispatch = useAppDispatch();
    const liRef = useRef<HTMLLIElement>(null);

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
    const isFocused = useAppSelector((state) => selectIsFocused(state, id));
    const isSelected = useIsCategorySelected(id);
    const { query, visible, onSelect } = useTreeSearch();
    const isSearchActive = query !== "";

    useEffect(() => {
        if (!isFocused || !liRef.current) return;
        const tree = liRef.current.closest('[role="tree"]');
        if (tree?.contains(document.activeElement)) {
            liRef.current.focus();
        }
    }, [isFocused]);

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
            ref={liRef}
            data-category-id={id}
            role="treeitem"
            aria-level={level}
            aria-setsize={setSize}
            aria-posinset={posInSet}
            tabIndex={isFocused ? 0 : -1}
            aria-expanded={displayHasChildren ? effectiveExpanded : undefined}
            aria-selected={isSelected ? true : undefined}
            className="flex flex-col outline-none [&:focus-visible>div:first-child]:ring-2 [&:focus-visible>div:first-child]:ring-ring"
        >
            <div
                className={cn(
                    "flex h-8 cursor-pointer items-center gap-1 rounded-sm pr-1 text-sm text-foreground",
                    isSelected &&
                        "bg-secondary text-secondary-foreground font-medium",
                )}
                style={{ paddingLeft: `${(level - 1) * 18 + 4}px` }}
                onClick={() => {
                    onSelect(id);
                    dispatch(setFocused(id));
                    liRef.current?.focus();
                }}
            >
                {displayHasChildren ? (
                    <span
                        aria-hidden="true"
                        className="shrink-0 text-muted-foreground"
                        onClick={(e) => {
                            e.stopPropagation();
                            dispatch(setFocused(id));
                            liRef.current?.focus();
                            if (!isSearchActive) dispatch(toggle(id));
                        }}
                    >
                        <ChevronRight
                            aria-hidden="true"
                            className={cn(
                                "size-3.5 transition-transform",
                                effectiveExpanded && "rotate-90",
                            )}
                        />
                    </span>
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
