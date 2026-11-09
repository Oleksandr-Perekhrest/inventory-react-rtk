// outsource dependencies
import type { SerializedError } from "@reduxjs/toolkit";

// local dependencies
import type { ApiErrorData } from "./types";

export function isApiErrorData(error: unknown): error is ApiErrorData {
    return (
        typeof error === "object" &&
        error !== null &&
        "code" in error &&
        "message" in error &&
        "status" in error
    );
}

export function getErrorMessage(
    error: ApiErrorData | SerializedError | undefined,
): string {
    if (error === undefined) return "Unknown error";
    if (isApiErrorData(error)) return error.message;
    return error.message ?? "Unknown error";
}
