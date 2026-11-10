// outsource dependencies
import { it, expect, describe } from "vitest";
import type { SerializedError } from "@reduxjs/toolkit";

// local dependencies
import type { ApiErrorData } from "./types";
import { isApiErrorData, getErrorStatus, getErrorMessage } from "./errors";

describe("getErrorMessage", () => {
    it("returns error.message for ApiErrorData", () => {
        const error: ApiErrorData = {
            status: 404,
            code: "NOT_FOUND",
            message: "Resource not found",
        };
        expect(getErrorMessage(error)).toBe("Resource not found");
    });

    it("returns error.message for SerializedError", () => {
        const error: SerializedError = { message: "Something went wrong" };
        expect(getErrorMessage(error)).toBe("Something went wrong");
    });

    it("returns 'Unknown error' when SerializedError has no message", () => {
        const error: SerializedError = {};
        expect(getErrorMessage(error)).toBe("Unknown error");
    });

    it("returns 'Unknown error' for undefined", () => {
        expect(getErrorMessage(undefined)).toBe("Unknown error");
    });
});

describe("getErrorStatus", () => {
    it("returns the numeric status for a 404 ApiErrorData", () => {
        const error: ApiErrorData = {
            status: 404,
            code: "NOT_FOUND",
            message: "Not found",
        };
        expect(getErrorStatus(error)).toBe(404);
    });

    it("returns the numeric status for a non-404 ApiErrorData", () => {
        const error: ApiErrorData = {
            status: 500,
            code: "INTERNAL_ERROR",
            message: "Server error",
        };
        expect(getErrorStatus(error)).toBe(500);
    });

    it("returns undefined for NETWORK_ERROR ApiErrorData (non-numeric status)", () => {
        const error: ApiErrorData = {
            status: "NETWORK_ERROR",
            code: "NETWORK_ERROR",
            message: "Network error",
        };
        expect(getErrorStatus(error)).toBeUndefined();
    });

    it("returns undefined for a SerializedError (no status field)", () => {
        expect(
            getErrorStatus({ message: "Something went wrong" }),
        ).toBeUndefined();
    });

    it("returns undefined for undefined", () => {
        expect(getErrorStatus(undefined)).toBeUndefined();
    });
});

describe("isApiErrorData", () => {
    it("returns true for an ApiErrorData object", () => {
        const error: ApiErrorData = {
            status: 500,
            code: "INTERNAL_ERROR",
            message: "Internal error",
        };
        expect(isApiErrorData(error)).toBe(true);
    });

    it("returns false for a SerializedError", () => {
        const error: SerializedError = { message: "Something went wrong" };
        expect(isApiErrorData(error)).toBe(false);
    });

    it("returns false for undefined", () => {
        expect(isApiErrorData(undefined)).toBe(false);
    });
});
