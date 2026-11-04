// outsource dependencies
import { it, expect, describe } from "vitest";
import { render, screen } from "@testing-library/react";

// local dependencies
import App from "./App";

describe("App", () => {
    it("renders the warehouse manager heading", () => {
        render(<App />);
        expect(
            screen.getByRole("heading", { name: /warehouse manager/i }),
        ).toBeVisible();
    });

    it("renders the get started button", () => {
        render(<App />);
        expect(
            screen.getByRole("button", { name: /get started/i }),
        ).toBeVisible();
    });
});
