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
import { routeTree } from "@/routeTree.gen";

export async function renderWithRouter(path: string) {
    const router = createRouter({
        routeTree,
        history: createMemoryHistory({ initialEntries: [path] }),
    });
    await router.load();
    const result = render(
        <Provider store={makeStore()}>
            <RouterProvider router={router} />
        </Provider>,
    );
    return { ...result, router };
}
