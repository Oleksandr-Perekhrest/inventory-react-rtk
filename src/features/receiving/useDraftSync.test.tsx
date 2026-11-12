// Using useReceivingForm (not a minimal form) because it already returns the
// correct ReceivingForm type with no casts required, and the test store
// satisfies useAppStore's context requirement via the Provider wrapper.

// outsource dependencies
import type { ReactNode } from "react";
import { Provider } from "react-redux";
import { act, renderHook } from "@testing-library/react";
import { it, vi, expect, describe, afterEach, beforeEach } from "vitest";

// local dependencies
import { makeStore } from "@/store/store";
import type { ReceiptDraft } from "@/domain";
import { useDraftSync } from "./useDraftSync";
import { useReceivingForm } from "./useReceivingForm";
import { createEmptyDraft } from "@/domain/receiving";
import { draftSaved, selectReceivingDraft } from "./receivingDraftSlice";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeInMemoryStorage() {
    const map = new Map<string, string>();
    return {
        getItem: (key: string) => map.get(key) ?? null,
        setItem: (key: string, value: string) => {
            map.set(key, value);
        },
        removeItem: (key: string) => {
            map.delete(key);
        },
    };
}

function makeWrapper(store: ReturnType<typeof makeStore>) {
    return function Wrapper({ children }: { children: ReactNode }) {
        return <Provider store={store}>{children}</Provider>;
    };
}

const TODAY = "2026-11-12";
const emptyDraft = createEmptyDraft(TODAY, "l1");

// Combined hook: creates the form then wires up draft sync.
function useFormWithSync(initialDraft: ReceiptDraft = emptyDraft) {
    const { form } = useReceivingForm({
        initialDraft,
        supplierExists: () => false,
        onInvalid: () => {},
    });
    const sync = useDraftSync(form);
    return { form, sync };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("useDraftSync", () => {
    let store: ReturnType<typeof makeStore>;

    beforeEach(() => {
        vi.useFakeTimers();
        store = makeStore({ storage: makeInMemoryStorage() });
    });

    afterEach(() => {
        vi.useRealTimers();
    });

    it("does not dispatch on mount without changes", () => {
        renderHook(() => useFormWithSync(), {
            wrapper: makeWrapper(store),
        });

        act(() => {
            vi.advanceTimersByTime(1000);
        });

        expect(selectReceivingDraft(store.getState())).toBeNull();
    });

    it("dispatches nothing before 300 ms and draftSaved after", () => {
        const { result } = renderHook(() => useFormWithSync(), {
            wrapper: makeWrapper(store),
        });

        act(() => {
            result.current.form.setFieldValue("document.supplierId", "sup-1");
        });

        act(() => {
            vi.advanceTimersByTime(299);
        });
        expect(selectReceivingDraft(store.getState())).toBeNull();

        act(() => {
            vi.advanceTimersByTime(1);
        });
        expect(selectReceivingDraft(store.getState())).not.toBeNull();
    });

    it("several changes within 300 ms result in one write with the last value", () => {
        const { result } = renderHook(() => useFormWithSync(), {
            wrapper: makeWrapper(store),
        });

        act(() => {
            result.current.form.setFieldValue("document.supplierId", "sup-1");
        });
        act(() => {
            vi.advanceTimersByTime(100);
        });
        act(() => {
            result.current.form.setFieldValue("document.supplierId", "sup-2");
        });
        act(() => {
            vi.advanceTimersByTime(300);
        });

        expect(
            selectReceivingDraft(store.getState())?.document.supplierId,
        ).toBe("sup-2");
    });

    it("dispatches draftDiscarded when values are empty per isDraftEmpty", () => {
        const nonEmptyDraft: ReceiptDraft = {
            ...emptyDraft,
            document: { ...emptyDraft.document, supplierId: "sup-1" },
        };

        // Pre-populate the store so we can observe it being cleared.
        act(() => {
            store.dispatch(draftSaved(nonEmptyDraft));
        });
        expect(selectReceivingDraft(store.getState())).not.toBeNull();

        const { result } = renderHook(() => useFormWithSync(nonEmptyDraft), {
            wrapper: makeWrapper(store),
        });

        // Clear supplierId — now isDraftEmpty returns true (all other fields blank).
        act(() => {
            result.current.form.setFieldValue("document.supplierId", "");
        });
        act(() => {
            vi.advanceTimersByTime(300);
        });

        expect(selectReceivingDraft(store.getState())).toBeNull();
    });

    it("flush() writes the pending draft immediately without waiting for the debounce", () => {
        const { result } = renderHook(() => useFormWithSync(), {
            wrapper: makeWrapper(store),
        });

        act(() => {
            result.current.form.setFieldValue("document.supplierId", "sup-1");
        });

        act(() => {
            result.current.sync.flush();
        });

        expect(selectReceivingDraft(store.getState())).not.toBeNull();
    });

    it("cancel() drops the pending write so no dispatch happens", () => {
        const { result } = renderHook(() => useFormWithSync(), {
            wrapper: makeWrapper(store),
        });

        act(() => {
            result.current.form.setFieldValue("document.supplierId", "sup-1");
        });

        act(() => {
            result.current.sync.cancel();
        });

        act(() => {
            vi.advanceTimersByTime(1000);
        });

        expect(selectReceivingDraft(store.getState())).toBeNull();
    });

    it("unmount flushes the pending write before tearing down", () => {
        const { result, unmount } = renderHook(() => useFormWithSync(), {
            wrapper: makeWrapper(store),
        });

        act(() => {
            result.current.form.setFieldValue("document.supplierId", "sup-1");
        });

        unmount();

        expect(selectReceivingDraft(store.getState())).not.toBeNull();
    });

    it("window pagehide event flushes the pending write", () => {
        const { result } = renderHook(() => useFormWithSync(), {
            wrapper: makeWrapper(store),
        });

        act(() => {
            result.current.form.setFieldValue("document.supplierId", "sup-1");
        });

        act(() => {
            window.dispatchEvent(new Event("pagehide"));
        });

        expect(selectReceivingDraft(store.getState())).not.toBeNull();
    });
});
