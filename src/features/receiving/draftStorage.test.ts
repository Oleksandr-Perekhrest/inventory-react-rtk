// outsource dependencies
import { it, expect, describe, beforeEach } from "vitest";

// local dependencies
import type { ReceiptDraft } from "../../domain";
import type { KeyValueStorage } from "./draftStorage";
import {
    loadDraft,
    saveDraft,
    clearDraft,
    DRAFT_VERSION,
    DRAFT_STORAGE_KEY,
} from "./draftStorage";

// ---------------------------------------------------------------------------
// In-memory storage factory
// ---------------------------------------------------------------------------

function makeStorage(): KeyValueStorage & { _map: Map<string, string> } {
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

const validDraft: ReceiptDraft = {
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
// loadDraft
// ---------------------------------------------------------------------------

describe("loadDraft", () => {
    let storage: ReturnType<typeof makeStorage>;

    beforeEach(() => {
        storage = makeStorage();
    });

    it("returns null when key is missing", () => {
        expect(loadDraft(storage)).toBeNull();
    });

    it("returns null for invalid JSON", () => {
        storage._map.set(DRAFT_STORAGE_KEY, "not-json{{");
        expect(loadDraft(storage)).toBeNull();
    });

    it("returns null for wrong envelope version", () => {
        const envelope = JSON.stringify({
            version: DRAFT_VERSION + 1,
            draft: validDraft,
        });
        storage._map.set(DRAFT_STORAGE_KEY, envelope);
        expect(loadDraft(storage)).toBeNull();
    });

    it("returns null when draft shape fails schema validation", () => {
        const badDraft = { ...validDraft, step: "unknown-step" };
        const envelope = JSON.stringify({
            version: DRAFT_VERSION,
            draft: badDraft,
        });
        storage._map.set(DRAFT_STORAGE_KEY, envelope);
        expect(loadDraft(storage)).toBeNull();
    });

    it("returns null for a valid envelope missing the draft field", () => {
        const envelope = JSON.stringify({ version: DRAFT_VERSION });
        storage._map.set(DRAFT_STORAGE_KEY, envelope);
        expect(loadDraft(storage)).toBeNull();
    });
});

// ---------------------------------------------------------------------------
// Round trip
// ---------------------------------------------------------------------------

describe("saveDraft + loadDraft round trip", () => {
    it("persists and restores a draft", () => {
        const storage = makeStorage();
        saveDraft(storage, validDraft);
        expect(loadDraft(storage)).toEqual(validDraft);
    });
});

// ---------------------------------------------------------------------------
// clearDraft
// ---------------------------------------------------------------------------

describe("clearDraft", () => {
    it("removes the stored draft so loadDraft returns null", () => {
        const storage = makeStorage();
        saveDraft(storage, validDraft);
        clearDraft(storage);
        expect(loadDraft(storage)).toBeNull();
    });
});

// ---------------------------------------------------------------------------
// Error resilience
// ---------------------------------------------------------------------------

describe("saveDraft with throwing storage", () => {
    it("returns false and does not throw", () => {
        const throwing: KeyValueStorage = {
            getItem: () => null,
            setItem: () => {
                throw new Error("quota exceeded");
            },
            removeItem: () => {},
        };
        expect(saveDraft(throwing, validDraft)).toBe(false);
    });
});

describe("clearDraft with throwing storage", () => {
    it("does not throw", () => {
        const throwing: KeyValueStorage = {
            getItem: () => null,
            setItem: () => {},
            removeItem: () => {
                throw new Error("privacy mode");
            },
        };
        expect(() => clearDraft(throwing)).not.toThrow();
    });
});
