// outsource dependencies
import * as z from "zod";

// local dependencies
import { type ReceiptDraft, receiptDraftSchema } from "../../domain";

export interface KeyValueStorage {
    getItem(key: string): string | null;
    setItem(key: string, value: string): void;
    removeItem(key: string): void;
}

export const DRAFT_STORAGE_KEY = "warehouse-manager:receiving-draft";
// bump DRAFT_VERSION when ReceiptDraft changes shape
export const DRAFT_VERSION = 1;

const DraftEnvelopeSchema = z.object({
    version: z.literal(DRAFT_VERSION),
    draft: receiptDraftSchema,
});

export function loadDraft(storage: KeyValueStorage): ReceiptDraft | null {
    try {
        const raw = storage.getItem(DRAFT_STORAGE_KEY);
        if (raw === null) return null;
        const result = DraftEnvelopeSchema.safeParse(JSON.parse(raw));
        return result.success ? result.data.draft : null;
    } catch {
        return null;
    }
}

export function saveDraft(
    storage: KeyValueStorage,
    draft: ReceiptDraft,
): boolean {
    try {
        storage.setItem(
            DRAFT_STORAGE_KEY,
            JSON.stringify({ version: DRAFT_VERSION, draft }),
        );
        return true;
    } catch {
        return false;
    }
}

export function clearDraft(storage: KeyValueStorage): void {
    try {
        storage.removeItem(DRAFT_STORAGE_KEY);
    } catch {
        // ignore quota / privacy-mode errors
    }
}
