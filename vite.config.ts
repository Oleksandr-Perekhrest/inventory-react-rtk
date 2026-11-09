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
