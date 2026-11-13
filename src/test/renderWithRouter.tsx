// outsource dependencies
import { Provider } from "react-redux";
import { render } from "@testing-library/react";
import {
    createRouter,
    RouterProvider,
    createMemoryHistory,
} from "@tanstack/react-router";

// local dependencies
import { makeStore } from "@/store/store";
import { routerDefaults } from "@/router";
import { routeTree } from "@/routeTree.gen";
import type { AppStore } from "@/store/store";

export async function renderWithRouter(
    path: string,
    options?: { store?: AppStore },
) {
    const store = options?.store ?? makeStore();
    const router = createRouter({
        routeTree,
        context: { store },
        history: createMemoryHistory({ initialEntries: [path] }),
        ...routerDefaults,
    });
    await router.load();
    const result = render(
        <Provider store={store}>
            <RouterProvider router={router} />
        </Provider>,
    );
    return { ...result, router };
}
