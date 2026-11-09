// outsource dependencies
import { createFileRoute } from "@tanstack/react-router";

// local dependencies
import { CatalogPage } from "../features/category-tree/CatalogPage";

export const Route = createFileRoute("/catalog")({
    component: CatalogPage,
});
