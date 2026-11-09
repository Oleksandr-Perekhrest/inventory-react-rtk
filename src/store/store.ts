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

export type AppStore = ReturnType<typeof makeStore>;
export type RootState = ReturnType<AppStore["getState"]>;
export type AppDispatch = AppStore["dispatch"];
