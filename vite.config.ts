/// <reference types="vitest/config" />
// outsource dependencies
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { TanStackRouterVite } from "@tanstack/router-plugin/vite";

// https://vite.dev/config/
export default defineConfig({
    plugins: [
        TanStackRouterVite({
            target: "react",
            autoCodeSplitting: true,
            routeFileIgnorePattern: "\\.test\\.(ts|tsx)$",
        }),
        react(),
        tailwindcss(),
    ],
    resolve: {
        alias: {
            "@": `${import.meta.dirname}/src`,
        },
    },
    test: {
        environment: "jsdom",
        setupFiles: ["src/test/setup.ts"],
        globals: false,
    },
});
