// local dependencies
import type { Category } from "../../domain";

export const categories: Category[] = [
    // depth 0 — roots
    { id: "cat-food", name: "Food", parentId: null, position: 0 },
    { id: "cat-packaging", name: "Packaging", parentId: null, position: 1 },
    {
        id: "cat-cleaning",
        name: "Cleaning Supplies",
        parentId: null,
        position: 2,
    },

    // depth 1 — food children
    { id: "cat-dairy", name: "Dairy", parentId: "cat-food", position: 0 },
    { id: "cat-meat", name: "Meat", parentId: "cat-food", position: 1 },
    {
        id: "cat-fish-seafood",
        name: "Fish & Seafood",
        parentId: "cat-food",
        position: 2,
    },
    { id: "cat-bakery", name: "Bakery", parentId: "cat-food", position: 3 },
    {
        id: "cat-beverages",
        name: "Beverages",
        parentId: "cat-food",
        position: 4,
    },
    {
        id: "cat-canned-dry",
        name: "Canned & Dry Goods",
        parentId: "cat-food",
        position: 5,
    },
    {
        id: "cat-oils-condiments",
        name: "Oils & Condiments",
        parentId: "cat-food",
        position: 6,
    },

    // depth 1 — packaging children
    {
        id: "cat-bags-wraps",
        name: "Bags & Wraps",
        parentId: "cat-packaging",
        position: 0,
    },
    {
        id: "cat-containers",
        name: "Containers",
        parentId: "cat-packaging",
        position: 1,
    },

    // depth 1 — cleaning children
    {
        id: "cat-detergents",
        name: "Detergents",
        parentId: "cat-cleaning",
        position: 0,
    },
    {
        id: "cat-cleaning-equip",
        name: "Cleaning Equipment",
        parentId: "cat-cleaning",
        position: 1,
    },

    // depth 2 — dairy children
    { id: "cat-cheese", name: "Cheese", parentId: "cat-dairy", position: 0 },
    {
        id: "cat-milk-cream",
        name: "Milk & Cream",
        parentId: "cat-dairy",
        position: 1,
    },
    {
        id: "cat-butter-yogurt",
        name: "Butter & Yogurt",
        parentId: "cat-dairy",
        position: 2,
    },

    // depth 2 — meat children
    {
        id: "cat-fresh-meat",
        name: "Fresh Meat",
        parentId: "cat-meat",
        position: 0,
    },
    {
        id: "cat-processed-meat",
        name: "Processed Meat",
        parentId: "cat-meat",
        position: 1,
    },

    // depth 2 — bakery children
    { id: "cat-bread", name: "Bread", parentId: "cat-bakery", position: 0 },
    { id: "cat-pastry", name: "Pastry", parentId: "cat-bakery", position: 1 },

    // depth 2 — beverages children
    {
        id: "cat-juices",
        name: "Juices",
        parentId: "cat-beverages",
        position: 0,
    },
    { id: "cat-water", name: "Water", parentId: "cat-beverages", position: 1 },

    // depth 3 — cheese children (deepest level, depth 3 → path length 4)
    {
        id: "cat-hard-cheese",
        name: "Hard Cheese",
        parentId: "cat-cheese",
        position: 0,
    },
    {
        id: "cat-soft-cheese",
        name: "Soft Cheese",
        parentId: "cat-cheese",
        position: 1,
    },

    // depth 1 — food children (continued)
    { id: "cat-frozen", name: "Frozen", parentId: "cat-food", position: 7 },
];
