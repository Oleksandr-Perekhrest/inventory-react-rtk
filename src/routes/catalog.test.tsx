// outsource dependencies
import { it, expect, describe } from "vitest";
import { render, screen } from "@testing-library/react";
import {
    createRouter,
    RouterProvider,
    createMemoryHistory,
} from "@tanstack/react-router";

// local dependencies
import { routeTree } from "@/routeTree.gen";

describe("Catalog page", () => {
    it("renders the Catalog heading", async () => {
        const router = createRouter({
            routeTree,
            history: createMemoryHistory({ initialEntries: ["/catalog"] }),
        });
        await router.load();
        render(<RouterProvider router={router} />);
        expect(screen.getByRole("heading", { name: /catalog/i })).toBeVisible();
    });
});
