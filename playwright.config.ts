// outsource dependencies
import { devices, defineConfig } from "@playwright/test";

export default defineConfig({
    testDir: "e2e",
    fullyParallel: true,
    forbidOnly: !!process.env.CI,
    retries: process.env.CI ? 1 : 0,
    failOnFlakyTests: !!process.env.CI,
    workers: process.env.CI ? 2 : undefined,
    reporter: process.env.CI
        ? [["github"], ["html", { open: "never" }]]
        : "list",
    use: {
        baseURL: "http://localhost:4173",
        trace: "on-first-retry",
        // MSW in the production build needs the service worker
        serviceWorkers: "allow",
    },
    projects: [
        {
            name: "chromium",
            use: { ...devices["Desktop Chrome"] },
        },
        {
            name: "firefox",
            use: { ...devices["Desktop Firefox"] },
        },
    ],
    webServer: {
        command: "pnpm build && pnpm preview --port 4173 --strictPort",
        url: "http://localhost:4173",
        reuseExistingServer: !process.env.CI,
        timeout: 120_000,
    },
});
