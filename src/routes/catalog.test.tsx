// outsource dependencies
import { it, expect, describe } from "vitest";
import { screen } from "@testing-library/react";

// local dependencies
import { renderWithRouter } from "@/test/renderWithRouter";

describe("Catalog page", () => {
    it("renders the Catalog heading", async () => {
        await renderWithRouter("/catalog");
        expect(screen.getByRole("heading", { name: /catalog/i })).toBeVisible();
    });
});
