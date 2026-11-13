/// <reference types="vitest/config" />
// outsource dependencies
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { visualizer } from "rollup-plugin-visualizer";
import { tanstackRouter } from "@tanstack/router-plugin/vite";

// https://vite.dev/config/
export default defineConfig({
    plugins: [
        tanstackRouter({
            target: "react",
            autoCodeSplitting: true,
            routeFileIgnorePattern: "\\.test\\.(ts|tsx)$",
        }),
        react(),
        tailwindcss(),
        ...(process.env.ANALYZE
            ? [
                  visualizer({
                      filename: "stats.html",
                      gzipSize: true,
                      brotliSize: true,
                  }),
              ]
            : []),
    ],
    build: {
        rolldownOptions: {
            output: {
                codeSplitting: {
                    groups: [
                        {
                            name: "vendor-react",
                            test: /[\\/]node_modules[\\/](react|react-dom|scheduler)[\\/]/,
                            priority: 10,
                        },
                        {
                            name: "vendor-table",
                            test: /[\\/]node_modules[\\/]@tanstack[\\/](react-table|table-core)[\\/]/,
                            priority: 10,
                        },
                        {
                            name: "vendor-router",
                            test: /[\\/]node_modules[\\/]@tanstack[\\/](react-router|router-core|history|react-store|store)[\\/]/,
                            priority: 9,
                        },
                        {
                            name: "vendor-redux",
                            test: /[\\/]node_modules[\\/](@reduxjs[\\/]toolkit|react-redux|redux|immer|reselect)[\\/]/,
                            priority: 8,
                        },
                        {
                            name: "vendor-ui",
                            test: /[\\/]node_modules[\\/](radix-ui|@radix-ui|lucide-react|sonner|class-variance-authority)[\\/]/,
                            priority: 7,
                        },
                        {
                            name: "vendor-dnd",
                            test: /[\\/]node_modules[\\/](@dnd-kit|@preact[\\/]signals-core)[\\/]/,
                            priority: 10,
                        },
                        {
                            name: "vendor-charts",
                            test: /[\\/]node_modules[\\/](recharts|decimal\.js-light|es-toolkit|eventemitter3|tiny-invariant|victory-vendor|clsx)[\\/]/,
                            priority: 7,
                        },
                        {
                            name: "vendor-zod",
                            test: /[\\/]node_modules[\\/]zod[\\/]/,
                            priority: 6,
                        },
                    ],
                },
            },
        },
    },
    resolve: {
        alias: {
            "@": `${import.meta.dirname}/src`,
        },
    },
    test: {
        environment: "jsdom",
        setupFiles: ["src/test/setup.ts"],
        globals: false,
        include: ["src/**/*.test.{ts,tsx}"],
        // UI integration tests (router + store + MSW + userEvent) take 4–6 s under load;
        // the default 5 s limit made them fail on time, not on behavior.
        testTimeout: 15_000,
    },
});
