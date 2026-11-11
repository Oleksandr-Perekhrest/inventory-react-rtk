// outsource dependencies
import { setupListeners } from "@reduxjs/toolkit/query";
import {
    isAnyOf,
    configureStore,
    createListenerMiddleware,
} from "@reduxjs/toolkit";

// local dependencies
import { baseApi } from "../api/baseApi";
import type { KeyValueStorage } from "../features/receiving/draftStorage";
import { categoryTreeSlice } from "../features/category-tree/categoryTreeSlice";
import {
    loadDraft,
    saveDraft,
    clearDraft,
} from "../features/receiving/draftStorage";
import {
    draftSaved,
    draftStarted,
    draftDiscarded,
    receivingDraftSlice,
} from "../features/receiving/receivingDraftSlice";

function createInMemoryStorage(): KeyValueStorage {
    const map = new Map<string, string>();
    return {
        getItem: (key) => map.get(key) ?? null,
        setItem: (key, value) => {
            map.set(key, value);
        },
        removeItem: (key) => {
            map.delete(key);
        },
    };
}

function getDefaultStorage(): KeyValueStorage {
    try {
        return window.localStorage;
    } catch {
        return createInMemoryStorage();
    }
}

const isSaveDraftAction = isAnyOf(draftStarted, draftSaved);

export function makeStore(options?: { storage?: KeyValueStorage }) {
    const storage = options?.storage ?? getDefaultStorage();

    const listenerMiddleware = createListenerMiddleware();

    listenerMiddleware.startListening({
        matcher: isSaveDraftAction,
        effect: (action) => {
            saveDraft(storage, action.payload);
        },
    });

    listenerMiddleware.startListening({
        actionCreator: draftDiscarded,
        effect: () => {
            clearDraft(storage);
        },
    });

    const store = configureStore({
        reducer: {
            [baseApi.reducerPath]: baseApi.reducer,
            categoryTree: categoryTreeSlice.reducer,
            receivingDraft: receivingDraftSlice.reducer,
        },
        preloadedState: {
            receivingDraft: { draft: loadDraft(storage) },
        },
        middleware: (getDefaultMiddleware) =>
            getDefaultMiddleware()
                .prepend(listenerMiddleware.middleware)
                .concat(baseApi.middleware),
    });

    setupListeners(store.dispatch);
    return store;
}

export type AppStore = ReturnType<typeof makeStore>;
export type RootState = ReturnType<AppStore["getState"]>;
export type AppDispatch = AppStore["dispatch"];
