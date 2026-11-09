// local dependencies
import type { Product, Category, Movement, Supplier } from "../domain";

export type Paginated<T> = {
    items: T[];
    total: number;
    page: number;
    pageSize: number;
};

export type CategoryWithCounts = Category & {
    productCount: number;
    totalProductCount: number;
};

export type MovementListItem = Movement & {
    product: Pick<Product, "id" | "name" | "sku" | "unit">;
    supplier: Pick<Supplier, "id" | "name"> | null;
};

export type ApiErrorBody = {
    error: {
        code: string;
        message: string;
        fields?: Record<string, string>;
    };
};
