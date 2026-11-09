// outsource dependencies
import { StrictMode } from "react";
import { Provider } from "react-redux";
import { createRoot } from "react-dom/client";
import { createRouter, RouterProvider } from "@tanstack/react-router";

// local dependencies
import "./index.css";
import { makeStore } from "./store/store";
import { routeTree } from "./routeTree.gen";
import { setBackendReady } from "./api/backendReady";

const router = createRouter({ routeTree });

declare module "@tanstack/react-router" {
    interface Register {
        router: typeof router;
    }
}

const store = makeStore();

const mocksStart = import("./mocks/start").then((m) => m.mocksReady);
setBackendReady(mocksStart);
mocksStart.catch((err) =>
    console.error("[warehouse-manager] MSW worker failed to start:", err),
);

createRoot(document.getElementById("root")!).render(
    <StrictMode>
        <Provider store={store}>
            <RouterProvider router={router} />
        </Provider>
    </StrictMode>,
);
