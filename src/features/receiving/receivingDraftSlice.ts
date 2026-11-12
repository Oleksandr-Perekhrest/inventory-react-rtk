// outsource dependencies
import { createSlice, type PayloadAction } from "@reduxjs/toolkit";

// local dependencies
import type { ReceiptDraft } from "../../domain";
import { demoApi } from "../../api/endpoints/demo";

type ReceivingDraftState = {
    draft: ReceiptDraft | null;
    resetNonce: number;
};

const initialState: ReceivingDraftState = {
    draft: null,
    resetNonce: 0,
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
    extraReducers: (builder) => {
        builder.addMatcher(
            demoApi.endpoints.resetDemo.matchFulfilled,
            (state) => {
                state.draft = null;
                state.resetNonce += 1;
            },
        );
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

export const selectResetNonce = (state: {
    receivingDraft: ReceivingDraftState;
}): number => state.receivingDraft.resetNonce;
