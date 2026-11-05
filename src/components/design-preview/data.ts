export type CategoryState = "expanded" | "collapsed" | "leaf";

export interface CategoryRow {
    id: string;
    label: string;
    count: number;
    depth: number;
    state: CategoryState;
    selected?: boolean;
}

export const SEARCH_QUERY = "dai";

export const CATEGORIES: CategoryRow[] = [
    {
        id: "food",
        label: "Food & Beverages",
        count: 96,
        depth: 0,
        state: "expanded",
    },
    {
        id: "dairy",
        label: "Dairy",
        count: 24,
        depth: 1,
        state: "leaf",
        selected: true,
    },
    { id: "bakery", label: "Bakery", count: 18, depth: 1, state: "leaf" },
    { id: "frozen", label: "Frozen", count: 31, depth: 1, state: "collapsed" },
    {
        id: "beverages",
        label: "Beverages",
        count: 23,
        depth: 1,
        state: "collapsed",
    },
    {
        id: "household",
        label: "Household",
        count: 64,
        depth: 0,
        state: "collapsed",
    },
    { id: "garden", label: "Garden", count: 52, depth: 0, state: "collapsed" },
    {
        id: "packaging",
        label: "Packaging",
        count: 36,
        depth: 0,
        state: "collapsed",
    },
];

export type StockStatus = "ok" | "low" | "out";

export interface ProductRow {
    sku: string;
    name: string;
    unit: string;
    stock: number;
    min: number;
    price: string;
    updated: string;
}

export const PRODUCTS: ProductRow[] = [
    {
        sku: "DAI-001",
        name: "Whole milk 3.2%",
        unit: "1 L",
        stock: 142,
        min: 60,
        price: "$1.29",
        updated: "Nov 4",
    },
    {
        sku: "DAI-002",
        name: "Greek yogurt",
        unit: "500 g",
        stock: 18,
        min: 40,
        price: "$2.49",
        updated: "Nov 4",
    },
    {
        sku: "DAI-003",
        name: "Butter 82%",
        unit: "200 g",
        stock: 64,
        min: 30,
        price: "$2.89",
        updated: "Nov 3",
    },
    {
        sku: "DAI-004",
        name: "Cheddar cheese",
        unit: "1 kg",
        stock: 9,
        min: 15,
        price: "$11.40",
        updated: "Nov 2",
    },
    {
        sku: "DAI-005",
        name: "Kefir 1%",
        unit: "900 ml",
        stock: 87,
        min: 40,
        price: "$1.59",
        updated: "Nov 4",
    },
    {
        sku: "DAI-006",
        name: "Cottage cheese 5%",
        unit: "400 g",
        stock: 0,
        min: 20,
        price: "$1.99",
        updated: "Oct 31",
    },
    {
        sku: "DAI-007",
        name: "Sour cream 20%",
        unit: "350 g",
        stock: 56,
        min: 25,
        price: "$1.39",
        updated: "Nov 3",
    },
    {
        sku: "DAI-008",
        name: "Heavy cream 33%",
        unit: "500 ml",
        stock: 31,
        min: 20,
        price: "$2.19",
        updated: "Nov 1",
    },
];

export function getStockStatus(product: ProductRow): StockStatus {
    if (product.stock === 0) return "out";
    if (product.stock < product.min) return "low";
    return "ok";
}
