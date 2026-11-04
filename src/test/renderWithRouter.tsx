// outsource dependencies
import { render } from "@testing-library/react";
import {
    createRouter,
    RouterProvider,
    createMemoryHistory,
} from "@tanstack/react-router";

// local dependencies
import { routeTree } from "@/routeTree.gen";

export async function renderWithRouter(path: string) {
    const router = createRouter({
        routeTree,
        history: createMemoryHistory({ initialEntries: [path] }),
    });
    await router.load();
    return render(<RouterProvider router={router} />);
}
