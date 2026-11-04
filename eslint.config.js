// outsource dependencies
import js from "@eslint/js";
import globals from "globals";
import tseslint from "typescript-eslint";
import reactHooks from "eslint-plugin-react-hooks";
import prettierConfig from "eslint-config-prettier";
import reactRefresh from "eslint-plugin-react-refresh";
import perfectionist from "eslint-plugin-perfectionist";
import { defineConfig, globalIgnores } from "eslint/config";

const perfectionistRules = {
    "perfectionist/sort-imports": [
        "error",
        {
            type: "line-length",
            order: "asc",
            sortSideEffects: false,
            newlinesBetween: 0,
            internalPattern: ["^@/"],
            groups: [
                {
                    group: [
                        "value-builtin",
                        "type-builtin",
                        "value-external",
                        "type-external",
                    ],
                    commentAbove: "outsource dependencies",
                },
                { newlinesBetween: 1 },
                {
                    group: [
                        "type-internal",
                        "value-internal",
                        "type-parent",
                        "value-parent",
                        "type-sibling",
                        "value-sibling",
                        "type-index",
                        "value-index",
                    ],
                    commentAbove: "local dependencies",
                },
            ],
        },
    ],
    "perfectionist/sort-named-imports": [
        "error",
        { type: "line-length", order: "asc" },
    ],
};

export default defineConfig([
    globalIgnores(["dist", "src/routeTree.gen.ts"]),
    {
        files: ["**/*.{ts,tsx}"],
        extends: [
            js.configs.recommended,
            tseslint.configs.recommended,
            reactHooks.configs.flat.recommended,
            reactRefresh.configs.vite,
        ],
        languageOptions: {
            globals: globals.browser,
        },
        plugins: {
            perfectionist,
        },
        rules: {
            ...perfectionistRules,
            "react-refresh/only-export-components": [
                "error",
                { allowConstantExport: true },
            ],
        },
    },
    {
        files: ["**/*.js"],
        plugins: {
            perfectionist,
        },
        rules: perfectionistRules,
    },
    prettierConfig,
]);
