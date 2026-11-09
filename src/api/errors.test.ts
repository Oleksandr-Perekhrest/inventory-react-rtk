// outsource dependencies
import { it, expect, describe } from "vitest";
import type { SerializedError } from "@reduxjs/toolkit";

// local dependencies
import type { ApiErrorData } from "./types";
import { isApiErrorData, getErrorMessage } from "./errors";

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
