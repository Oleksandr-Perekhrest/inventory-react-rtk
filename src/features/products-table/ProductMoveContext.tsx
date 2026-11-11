// outsource dependencies
import { useContext, createContext } from "react";

// local dependencies
import type { Product } from "@/domain";

export type ProductMoveContextValue = {
    requestMove(product: Product, trigger: HTMLElement): void;
};

export const ProductMoveContext = createContext<ProductMoveContextValue | null>(
    null,
);

export function useProductMove(): ProductMoveContextValue {
    const ctx = useContext(ProductMoveContext);
    if (ctx === null)
        throw new Error("useProductMove must be used inside ProductsTable");
    return ctx;
}
