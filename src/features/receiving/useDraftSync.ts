// outsource dependencies
import { useRef, useEffect, useCallback } from "react";

// local dependencies
import { useAppDispatch } from "@/store/hooks";
import type { ReceivingForm } from "./useReceivingForm";
import { draftSaved, draftDiscarded } from "./receivingDraftSlice";
import { isDraftEmpty, type ReceiptDraft } from "@/domain/receiving";

const DEBOUNCE_MS = 300;

export function useDraftSync(form: ReceivingForm): {
    flush: () => void;
    cancel: () => void;
} {
    const dispatch = useAppDispatch();
    const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const pendingRef = useRef<ReceiptDraft | null>(null);

    const commit = useCallback(
        (values: ReceiptDraft) => {
            if (isDraftEmpty(values)) {
                dispatch(draftDiscarded());
            } else {
                dispatch(draftSaved(values));
            }
        },
        [dispatch],
    );

    const cancel = useCallback(() => {
        if (timerRef.current !== null) {
            clearTimeout(timerRef.current);
            timerRef.current = null;
        }
        pendingRef.current = null;
    }, []);

    const flush = useCallback(() => {
        if (timerRef.current !== null) {
            clearTimeout(timerRef.current);
            timerRef.current = null;
        }
        const pending = pendingRef.current;
        if (pending !== null) {
            pendingRef.current = null;
            commit(pending);
        }
    }, [commit]);

    useEffect(() => {
        const store = form.store;
        let lastValues = store.state.values;

        const subscription = store.subscribe((state) => {
            if (state.values === lastValues) return;
            lastValues = state.values;
            pendingRef.current = state.values;
            if (timerRef.current !== null) {
                clearTimeout(timerRef.current);
            }
            timerRef.current = setTimeout(() => {
                timerRef.current = null;
                const pending = pendingRef.current;
                if (pending !== null) {
                    pendingRef.current = null;
                    commit(pending);
                }
            }, DEBOUNCE_MS);
        });

        const handlePageHide = () => {
            flush();
        };
        window.addEventListener("pagehide", handlePageHide);

        return () => {
            flush();
            subscription.unsubscribe();
            window.removeEventListener("pagehide", handlePageHide);
        };
    }, [form.store, commit, flush]);

    return { flush, cancel };
}
