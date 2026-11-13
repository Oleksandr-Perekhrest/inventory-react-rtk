// outsource dependencies
import { http } from "msw";
import type { AnyHandler } from "msw";

// local dependencies
import type { Db } from "../db";
import { createRouteHandler } from "./route";
import { demoReset } from "./controllers/demo";
import type { NetworkConfig } from "./network";
import { postReceipt } from "./controllers/receipts";
import { getDashboard } from "./controllers/dashboard";
import { listMovements } from "./controllers/movements";
import { listSuppliers } from "./controllers/suppliers";
import { receiptPayloadSchema } from "../../domain/receiving";
import {
    listCategories,
    moveCategoryController,
} from "./controllers/categories";
import {
    getProduct,
    listProducts,
    updateProductController,
} from "./controllers/products";
import {
    dashboardQuerySchema,
    movementsQuerySchema,
    suppliersQuerySchema,
    categoriesQuerySchema,
    getProductQuerySchema,
    moveCategoryBodySchema,
    listProductsQuerySchema,
    updateProductBodySchema,
} from "../../api/queries";

export function createHandlers({
    db,
    network,
}: {
    db: Db;
    network: NetworkConfig;
}): AnyHandler[] {
    const route = createRouteHandler({ db, network });

    return [
        http.post("/api/demo/reset", route(demoReset)),
        http.post(
            "/api/receipts",
            route(postReceipt, { bodySchema: receiptPayloadSchema }),
        ),
        http.get(
            "/api/categories",
            route(listCategories, { querySchema: categoriesQuerySchema }),
        ),
        http.post(
            "/api/categories/:id/move",
            route(moveCategoryController, {
                bodySchema: moveCategoryBodySchema,
            }),
        ),
        http.get(
            "/api/suppliers",
            route(listSuppliers, { querySchema: suppliersQuerySchema }),
        ),
        http.get(
            "/api/products",
            route(listProducts, { querySchema: listProductsQuerySchema }),
        ),
        http.get(
            "/api/products/:id",
            route(getProduct, { querySchema: getProductQuerySchema }),
        ),
        http.patch(
            "/api/products/:id",
            route(updateProductController, {
                bodySchema: updateProductBodySchema,
            }),
        ),
        http.get(
            "/api/dashboard",
            route(getDashboard, { querySchema: dashboardQuerySchema }),
        ),
        http.get(
            "/api/movements",
            route(listMovements, { querySchema: movementsQuerySchema }),
        ),
    ];
}
