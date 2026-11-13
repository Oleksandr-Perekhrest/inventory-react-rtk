// outsource dependencies
import { test, expect } from "@playwright/test";

test("/ shows the welcome page", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
});

test("/catalog loads data through MSW in the production build", async ({
    page,
}) => {
    await page.goto("/catalog");
    await expect(
        page.getByRole("tree").getByRole("treeitem", { name: "Food" }),
    ).toBeVisible();
});
