// local dependencies
import { useGetCategoriesQuery } from "../../api/endpoints/categories";

export function CategoryCell({ id }: { id: string }) {
    const { name } = useGetCategoriesQuery(undefined, {
        selectFromResult: ({ data }) => ({ name: data?.entities[id]?.name }),
    });
    return <>{name ?? "—"}</>;
}
