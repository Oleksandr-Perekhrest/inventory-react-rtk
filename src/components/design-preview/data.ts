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
