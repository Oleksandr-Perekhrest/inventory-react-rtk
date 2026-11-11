// outsource dependencies
import { createSlice, type PayloadAction } from "@reduxjs/toolkit";

// local dependencies
import type { ReceiptDraft } from "../../domain";

type ReceivingDraftState = {
    draft: ReceiptDraft | null;
};

const initialState: ReceivingDraftState = {
    draft: null,
};

export const receivingDraftSlice = createSlice({
    name: "receivingDraft",
    initialState,
    reducers: {
        draftStarted(state, action: PayloadAction<ReceiptDraft>) {
            state.draft = action.payload;
        },
        draftSaved(state, action: PayloadAction<ReceiptDraft>) {
            state.draft = action.payload;
        },
        draftDiscarded(state) {
            state.draft = null;
        },
    },
});

export const { draftStarted, draftSaved, draftDiscarded } =
    receivingDraftSlice.actions;

export const selectReceivingDraft = (state: {
    receivingDraft: ReceivingDraftState;
}): ReceiptDraft | null => state.receivingDraft.draft;

export const selectHasReceivingDraft = (state: {
    receivingDraft: ReceivingDraftState;
}): boolean => state.receivingDraft.draft !== null;
