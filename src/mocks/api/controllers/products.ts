// local dependencies
import type { Db } from "../../db";
import { notFound } from "../errors";
import { paginate } from "../pagination";
import type { Product } from "../../../domain";
import type { Paginated } from "../../../api/types";
import type { ListProductsQuery } from "../../../api/queries";
import { buildChildrenMap, collectDescendantIds } from "../tree";

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
        if (stock === "out") {
            products = products.filter((p) => p.quantity === 0);
        } else {
            products = products.filter(
                (p) => p.quantity > 0 && p.quantity < p.minQuantity,
            );
        }
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
