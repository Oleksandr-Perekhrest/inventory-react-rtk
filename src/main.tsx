// outsource dependencies
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { createRouter, RouterProvider } from "@tanstack/react-router";

// local dependencies
import "./index.css";
import { routeTree } from "./routeTree.gen";

const router = createRouter({ routeTree });

declare module "@tanstack/react-router" {
    interface Register {
        router: typeof router;
    }
}

createRoot(document.getElementById("root")!).render(
    <StrictMode>
        <RouterProvider router={router} />
    </StrictMode>,
);

import("./mocks/start")
    .then(({ mocksReady }) => mocksReady)
    .catch((err) =>
        console.error("[warehouse-manager] MSW worker failed to start:", err),
    );
