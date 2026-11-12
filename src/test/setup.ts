// outsource dependencies
import "@testing-library/jest-dom/vitest";
import { afterEach } from "vitest";
import { cleanup, configure } from "@testing-library/react";

// slow jsdom integration tests under parallel load; same reason as testTimeout 15 s
configure({ asyncUtilTimeout: 3000 });

afterEach(cleanup);

// jsdom does not implement scrollTo; TanStack Router calls it for scroll restoration
// Guard required because route.test.ts runs in node environment (no window)
if (typeof window !== "undefined") {
    window.scrollTo = () => {};

    Object.defineProperty(window, "matchMedia", {
        writable: true,
        // Evaluate min/max-width against window.innerWidth so tests render the desktop layout (jsdom default innerWidth = 1024).
        value: (query: string) => {
            const minMatch = /\(min-width:\s*(\d+)px\)/.exec(query);
            const maxMatch = /\(max-width:\s*(\d+)px\)/.exec(query);
            const matches = minMatch
                ? window.innerWidth >= Number(minMatch[1])
                : maxMatch
                  ? window.innerWidth <= Number(maxMatch[1])
                  : false;
            return {
                matches,
                media: query,
                onchange: null,
                addListener: () => {},
                removeListener: () => {},
                addEventListener: () => {},
                removeEventListener: () => {},
                dispatchEvent: () => false,
            };
        },
    });
}

// jsdom does not implement ResizeObserver; Radix Tooltip (Popper) measures its content with it
class ResizeObserverStub {
    observe() {}
    unobserve() {}
    disconnect() {}
}
globalThis.ResizeObserver ??= ResizeObserverStub;

// Radix Select uses pointer capture and scroll APIs not implemented in jsdom
if (typeof Element !== "undefined") {
    Element.prototype.hasPointerCapture ??= () => false;
    Element.prototype.releasePointerCapture ??= () => {};
    Element.prototype.scrollIntoView ??= () => {};
}
