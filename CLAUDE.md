# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
pnpm dev            # start dev server with HMR
pnpm build          # type-check then bundle
pnpm preview        # serve the dist/ build locally
pnpm lint           # run ESLint
pnpm typecheck      # run tsc --noEmit
pnpm test           # run Vitest
pnpm format         # format with Prettier (write)
pnpm format:check   # format with Prettier (check only)
```

Use **pnpm** exclusively. Node 24.x is required (see `.nvmrc`). Some scripts are added in upcoming steps; if a script does not exist yet, skip it and say so in the report.
Node 24 is the shell default (nvm alias). Run `pnpm` commands directly; do not source nvm or run `nvm use`.

## Stack

| Layer            | Choice                                                                                        |
| ---------------- | --------------------------------------------------------------------------------------------- |
| Build / Language | Vite, React 19, TypeScript 6 (strict), pnpm                                                   |
| State            | Redux Toolkit + RTK Query (server data via RTK Query with cache tags; client state in slices) |
| Styling / UI     | Tailwind CSS + shadcn/ui                                                                      |
| Forms            | TanStack Form + zod                                                                           |
| Drag and drop    | dnd-kit                                                                                       |
| Tables           | TanStack Table (server-side mode)                                                             |
| Routing          | TanStack Router                                                                               |
| Mock API         | MSW — enabled in dev, tests, and the production build (no backend)                            |
| Unit tests       | Vitest + React Testing Library + MSW                                                          |
| E2E              | Playwright                                                                                    |
| Hosting          | Vercel                                                                                        |

> TypeScript 7 is intentionally not used: typescript-eslint does not support it yet.

## Architecture

The app is a SPA admin for a small warehouse. Folder structure is defined stage by stage — do not create folders a task does not ask for.

## Code style

- **Indentation:** 4 spaces (Prettier `tabWidth: 4`); JSON, YAML, and Markdown use 2. Prettier defaults otherwise (double quotes, semicolons).
- ESM only, TypeScript strict; use `import type` for type-only imports.
- Imports are enforced by `eslint-plugin-perfectionist`. Write them correctly from the start instead of relying on `eslint --fix`:
  - Two groups. First: packages and Node built-ins, preceded by the comment `// outsource dependencies`. Then one blank line. Second: relative imports, preceded by the comment `// local dependencies`. No blank lines inside a group.
  - Within each group, sort import lines by line length, shortest first (type and value imports are sorted together).
  - Inside braces, sort named imports by length, shortest first.
  - Side-effect imports (e.g. CSS) go first in the local group, right after the `// local dependencies` comment. ESLint does not enforce their position, so follow this rule manually.

```ts
// outsource dependencies
import { z } from "zod";
import type { ReactNode } from "react";
import { useState, useCallback } from "react";
import { createSlice, type PayloadAction } from "@reduxjs/toolkit";

// local dependencies
import { api } from "./api";
import type { Product } from "../types";
import { formatPrice } from "../../utils/format";
import "./styles.css";
```

## Working rules

- Do NOT commit or push; the developer commits after reviewing.
- Work on the current branch; never switch branches.
- Do not add dependencies the task does not ask for.
- For library and GitHub Action versions, check current releases (e.g. `pnpm view <pkg> version`, `gh release view --repo <owner/action>`) instead of relying on memory.
- Before reporting, run the available checks: `pnpm format:check`, `pnpm lint`, `pnpm typecheck`, `pnpm test`, `pnpm build`.
- Report format: files changed (one line each), check results, anything skipped or not done.
