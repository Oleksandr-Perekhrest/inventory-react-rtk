import js from "@eslint/js";
import globals from "globals";
import reactHooks from "eslint-plugin-react-hooks";
import reactRefresh from "eslint-plugin-react-refresh";
import tseslint from "typescript-eslint";
import perfectionist from "eslint-plugin-perfectionist";
import { defineConfig, globalIgnores } from "eslint/config";
import prettierConfig from "eslint-config-prettier";

export default defineConfig([
    globalIgnores(["dist"]),
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
            "perfectionist/sort-imports": [
                "error",
                {
                    type: "line-length",
                    order: "asc",
                    sortSideEffects: false,
                    newlinesBetween: 0,
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
        },
    },
    prettierConfig,
]);
