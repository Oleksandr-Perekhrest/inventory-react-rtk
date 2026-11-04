// outsource dependencies
import { it, expect, describe } from "vitest";
import { render, screen } from "@testing-library/react";

// local dependencies
import App from "./App";

describe("App", () => {
    it("renders the get started heading", () => {
        render(<App />);
        expect(
            screen.getByRole("heading", { name: /get started/i }),
        ).toBeVisible();
    });
});
