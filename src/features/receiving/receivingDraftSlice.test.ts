// outsource dependencies
import { it, expect, describe, beforeEach } from "vitest";

// local dependencies
import { makeStore } from "../../store/store";
import type { ReceiptDraft } from "../../domain";
import type { KeyValueStorage } from "./draftStorage";
import { DRAFT_VERSION, DRAFT_STORAGE_KEY } from "./draftStorage";
import {
    draftSaved,
    draftStarted,
    draftDiscarded,
    receivingDraftSlice,
    selectReceivingDraft,
    selectHasReceivingDraft,
} from "./receivingDraftSlice";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeInMemoryStorage(): KeyValueStorage & {
    _map: Map<string, string>;
} {
    const _map = new Map<string, string>();
    return {
        _map,
        getItem: (key) => _map.get(key) ?? null,
        setItem: (key, value) => {
            _map.set(key, value);
        },
        removeItem: (key) => {
            _map.delete(key);
        },
    };
}

const draft: ReceiptDraft = {
    step: "document",
    document: {
        supplierId: "sup-1",
        invoiceNumber: "INV-001",
        date: "2026-11-12",
    },
    lines: [
        {
            id: "l1",
            productId: "prod-1",
            expectedQuantity: 5,
            batch: "",
            expiryDate: "",
        },
    ],
};

// ---------------------------------------------------------------------------
// Reducer unit tests (direct slice reducer, no store)
// ---------------------------------------------------------------------------

describe("receivingDraftSlice reducers", () => {
    const { reducer } = receivingDraftSlice;
    const initial = { draft: null, resetNonce: 0 };

    it("draftStarted stores the draft", () => {
        const state = reducer(initial, draftStarted(draft));
        expect(state.draft).toEqual(draft);
    });

    it("draftSaved stores the draft", () => {
        const state = reducer(initial, draftSaved(draft));
        expect(state.draft).toEqual(draft);
    });

    it("draftDiscarded clears the draft", () => {
        const withDraft = { draft, resetNonce: 0 };
        const state = reducer(withDraft, draftDiscarded());
        expect(state.draft).toBeNull();
    });

    it("selectReceivingDraft returns draft from state", () => {
        const state = reducer(initial, draftStarted(draft));
        expect(selectReceivingDraft({ receivingDraft: state })).toEqual(draft);
    });

    it("selectHasReceivingDraft returns true when draft exists", () => {
        const state = reducer(initial, draftStarted(draft));
        expect(selectHasReceivingDraft({ receivingDraft: state })).toBe(true);
    });

    it("selectHasReceivingDraft returns false when draft is null", () => {
        expect(selectHasReceivingDraft({ receivingDraft: initial })).toBe(
            false,
        );
    });
});

// ---------------------------------------------------------------------------
// makeStore: preloads stored draft on boot
// ---------------------------------------------------------------------------

describe("makeStore preloads draft from storage", () => {
    it("loads a valid stored draft into the slice on startup", () => {
        const storage = makeInMemoryStorage();
        const envelope = JSON.stringify({ version: DRAFT_VERSION, draft });
        storage._map.set(DRAFT_STORAGE_KEY, envelope);

        const store = makeStore({ storage });
        expect(selectReceivingDraft(store.getState())).toEqual(draft);
    });

    it("starts with null draft when storage is empty", () => {
        const storage = makeInMemoryStorage();
        const store = makeStore({ storage });
        expect(selectReceivingDraft(store.getState())).toBeNull();
    });
});

// ---------------------------------------------------------------------------
// makeStore: listener middleware wires storage on actions
// RTK calls the effect synchronously before its first internal await, so
// storage is updated within the same dispatch call.
// ---------------------------------------------------------------------------

describe("store listener middleware", () => {
    let storage: ReturnType<typeof makeInMemoryStorage>;
    let store: ReturnType<typeof makeStore>;

    beforeEach(() => {
        storage = makeInMemoryStorage();
        store = makeStore({ storage });
    });

    it("dispatching draftSaved writes the envelope to storage", () => {
        store.dispatch(draftSaved(draft));
        const raw = storage._map.get(DRAFT_STORAGE_KEY);
        expect(raw).toBeDefined();
        if (raw !== undefined) {
            const parsed = JSON.parse(raw);
            expect(parsed).toMatchObject({ version: DRAFT_VERSION, draft });
        }
    });

    it("dispatching draftStarted writes the envelope to storage", () => {
        store.dispatch(draftStarted(draft));
        const raw = storage._map.get(DRAFT_STORAGE_KEY);
        expect(raw).toBeDefined();
        if (raw !== undefined) {
            const parsed = JSON.parse(raw);
            expect(parsed).toMatchObject({ version: DRAFT_VERSION, draft });
        }
    });

    it("dispatching draftDiscarded removes the key from storage", () => {
        store.dispatch(draftSaved(draft));
        expect(storage._map.has(DRAFT_STORAGE_KEY)).toBe(true);

        store.dispatch(draftDiscarded());
        expect(storage._map.has(DRAFT_STORAGE_KEY)).toBe(false);
    });
});
