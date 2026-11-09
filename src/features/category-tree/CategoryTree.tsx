// local dependencies
import { ROOT } from "./tree";
import { TreeNode } from "./TreeNode";
import { Button } from "@/components/ui/button";
import { selectChildrenIndex } from "./selectors";
import { getErrorMessage } from "../../api/errors";
import { Skeleton } from "@/components/ui/skeleton";
import { useGetCategoriesQuery } from "../../api/endpoints/categories";

const labelId = "categories-tree-label";

export function CategoryTree() {
    const { data, isLoading, isError, error, refetch } =
        useGetCategoriesQuery();

    const rootChildIds = data
        ? (selectChildrenIndex(data).get(ROOT) ?? [])
        : [];

    return (
        <div className="flex w-full shrink-0 flex-col gap-2 self-start rounded-sm border bg-card p-3 md:w-64">
            <span
                id={labelId}
                className="font-mono text-[11px] font-semibold uppercase tracking-wider text-muted-foreground"
            >
                Categories
            </span>
            {isLoading && (
                <div className="flex flex-col gap-1">
                    {Array.from({ length: 5 }).map((_, i) => (
                        <Skeleton key={i} className="h-8 w-full rounded-sm" />
                    ))}
                </div>
            )}
            {isError && (
                <div className="flex flex-col gap-2 text-sm text-destructive">
                    <span>{getErrorMessage(error)}</span>
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={() => void refetch()}
                    >
                        Retry
                    </Button>
                </div>
            )}
            {data && (
                <ul
                    role="tree"
                    aria-labelledby={labelId}
                    className="flex flex-col gap-0.5"
                >
                    {rootChildIds.map((id) => (
                        <TreeNode key={id} id={id} level={1} />
                    ))}
                </ul>
            )}
        </div>
    );
}
