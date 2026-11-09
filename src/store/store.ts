// outsource dependencies
import { configureStore } from "@reduxjs/toolkit";
import { setupListeners } from "@reduxjs/toolkit/query";

// local dependencies
import { baseApi } from "../api/baseApi";
import { categoryTreeSlice } from "../features/category-tree/categoryTreeSlice";

export function makeStore() {
    const store = configureStore({
        reducer: {
            [baseApi.reducerPath]: baseApi.reducer,
            categoryTree: categoryTreeSlice.reducer,
        },
        middleware: (getDefaultMiddleware) =>
            getDefaultMiddleware().concat(baseApi.middleware),
    });
    setupListeners(store.dispatch);
    return store;
}

type Store = ReturnType<typeof makeStore>;
export type RootState = ReturnType<Store["getState"]>;
export type AppDispatch = Store["dispatch"];
