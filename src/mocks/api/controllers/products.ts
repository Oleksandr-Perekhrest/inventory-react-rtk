// local dependencies
import type { Db } from "../../db";
import { notFound } from "../errors";
import { paginate } from "../pagination";
import type { Paginated } from "../../../api/types";
import { stockStatus, type Product } from "../../../domain";
import { buildChildrenMap, collectDescendantIds } from "../tree";
import type {
    ListProductsQuery,
    UpdateProductBody,
} from "../../../api/queries";

export function listProducts({
    db,
    query,
}: {
    db: Db;
    query: ListProductsQuery;
}): { body: Paginated<Product> } {
    const {
        page,
        pageSize,
        sort,
        order,
        categoryId,
        includeDescendants,
        q,
        stock,
    } = query;

    let products = [...db.products];

    if (categoryId !== undefined) {
        const exists = db.categories.some((c) => c.id === categoryId);
        if (!exists) throw notFound(`Category '${categoryId}' not found`);

        if (includeDescendants) {
            const ids = collectDescendantIds(
                categoryId,
                buildChildrenMap(db.categories),
            );
            products = products.filter((p) => ids.has(p.categoryId));
        } else {
            products = products.filter((p) => p.categoryId === categoryId);
        }
    }

    if (q !== undefined && q !== "") {
        const lower = q.toLowerCase();
        products = products.filter(
            (p) =>
                p.name.toLowerCase().includes(lower) ||
                p.sku.toLowerCase().includes(lower),
        );
    }

    if (stock !== undefined) {
        products = products.filter((p) => stockStatus(p) === stock);
    }

    products.sort((a, b) => {
        let cmp = 0;
        switch (sort) {
            case "name":
                cmp = a.name.localeCompare(b.name);
                break;
            case "sku":
                cmp = a.sku.localeCompare(b.sku);
                break;
            case "quantity":
                cmp = a.quantity - b.quantity;
                break;
            case "price":
                cmp = a.price - b.price;
                break;
        }
        if (cmp === 0) cmp = a.id.localeCompare(b.id);
        return order === "asc" ? cmp : -cmp;
    });

    return { body: paginate(products, page, pageSize) };
}

export function getProduct({
    db,
    params,
}: {
    db: Db;
    params: Record<string, string>;
}): { body: Product } {
    const product = db.products.find((p) => p.id === params["id"]);
    if (!product) throw notFound(`Product '${params["id"]}' not found`);
    return { body: product };
}

export function updateProductController({
    db,
    params,
    body,
}: {
    db: Db;
    params: Record<string, string>;
    body: UpdateProductBody;
}): { body: Product } {
    const product = db.products.find((p) => p.id === params["id"]);
    if (!product) throw notFound("Product not found");

    const categoryExists = db.categories.some((c) => c.id === body.categoryId);
    if (!categoryExists) throw notFound("Category not found");

    if (product.categoryId === body.categoryId) {
        return { body: product };
    }

    const updatedProduct = db.transaction((draft): Product => {
        const p = draft.products.find((item) => item.id === params["id"]);
        if (p === undefined) throw notFound("Product not found");
        p.categoryId = body.categoryId;
        return { ...p };
    });

    return { body: updatedProduct };
}
