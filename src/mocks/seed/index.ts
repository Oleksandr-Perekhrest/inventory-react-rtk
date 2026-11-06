// local dependencies
import { products } from "./products";
import { suppliers } from "./suppliers";
import { categories } from "./categories";
import { generateMovements } from "./movements";

const FIXED_SEED = 0x5eed_b33f;

export function createSeed(now = new Date()) {
    const cats = structuredClone(categories);
    const prods = structuredClone(products);
    const sups = structuredClone(suppliers);

    const movements = generateMovements({
        products: prods,
        suppliers: sups,
        categories: cats,
        now,
        seed: FIXED_SEED,
    });

    return { categories: cats, products: prods, suppliers: sups, movements };
}
