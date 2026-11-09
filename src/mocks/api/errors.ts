export class ApiError extends Error {
    status: number;
    code: string;
    fields?: Record<string, string>;

    constructor(
        status: number,
        code: string,
        message: string,
        fields?: Record<string, string>,
    ) {
        super(message);
        this.name = "ApiError";
        this.status = status;
        this.code = code;
        this.fields = fields;
    }
}

export function notFound(message: string): ApiError {
    return new ApiError(404, "NOT_FOUND", message);
}

export function conflict(message: string): ApiError {
    return new ApiError(409, "CONFLICT", message);
}

export function badRequest(
    code: string,
    message: string,
    fields?: Record<string, string>,
): ApiError {
    return new ApiError(400, code, message, fields);
}

export function unprocessable(
    message: string,
    fields?: Record<string, string>,
): ApiError {
    return new ApiError(422, "UNPROCESSABLE_ENTITY", message, fields);
}
