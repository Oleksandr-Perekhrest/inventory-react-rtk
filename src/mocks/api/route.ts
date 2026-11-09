// outsource dependencies
import { ZodObject } from "zod";
import { delay, HttpResponse } from "msw";
import type { HttpResponseResolver } from "msw";
import type { ZodType, infer as ZodInfer } from "zod";

// local dependencies
import type { Db } from "../db";
import { ApiError } from "./errors";
import type { NetworkConfig } from "./network";

type ControllerResult = { status?: number; body?: unknown } | null | void;

type ControllerCtx<Q, B> = {
    db: Db;
    params: Record<string, string>;
    query: Q;
    body: B;
};

type Controller<Q, B> = (
    ctx: ControllerCtx<Q, B>,
) => ControllerResult | Promise<ControllerResult>;

type RouteOptions<
    Q extends ZodType | undefined,
    B extends ZodType | undefined,
> = {
    querySchema?: Q;
    bodySchema?: B;
};

type InferOrUndefined<T extends ZodType | undefined> = T extends ZodType
    ? ZodInfer<T>
    : undefined;

export type RouteHandlerConfig = { db: Db; network: NetworkConfig };

function errorJson(
    status: number,
    code: string,
    message: string,
    fields?: Record<string, string>,
): Response {
    return HttpResponse.json(
        { error: { code, message, ...(fields ? { fields } : {}) } },
        { status },
    );
}

export function createRouteHandler({ db, network }: RouteHandlerConfig) {
    return function route<
        Q extends ZodType | undefined = undefined,
        B extends ZodType | undefined = undefined,
    >(
        controller: Controller<InferOrUndefined<Q>, InferOrUndefined<B>>,
        options?: RouteOptions<Q, B>,
    ): HttpResponseResolver {
        return async ({ request, params: rawParams }) => {
            // --- delay ---
            if (network.delay !== 0) {
                const [min, max] = network.delay;
                const ms = Math.floor(min + network.random() * (max - min));
                await delay(ms);
            }

            // --- error simulation ---
            if (
                network.errorMode() === "random" &&
                network.random() < network.errorRate
            ) {
                if (network.random() < 0.5) {
                    return errorJson(
                        500,
                        "SIMULATED_FAILURE",
                        "Simulated server error",
                    );
                }
                return HttpResponse.error();
            }

            // --- parse query params ---
            const url = new URL(request.url);
            let parsedQuery: InferOrUndefined<Q> =
                undefined as InferOrUndefined<Q>;

            if (options?.querySchema) {
                const schema = options.querySchema;
                const queryObject: Record<string, string> = {};
                for (const [key, value] of url.searchParams.entries()) {
                    queryObject[key] = value;
                }

                if (schema instanceof ZodObject) {
                    const knownKeys = new Set(Object.keys(schema.shape));
                    const unknownFields: Record<string, string> = {};
                    for (const key of Object.keys(queryObject)) {
                        if (!knownKeys.has(key)) {
                            unknownFields[key] = "Unknown query parameter";
                        }
                    }
                    if (Object.keys(unknownFields).length > 0) {
                        return errorJson(
                            400,
                            "INVALID_QUERY",
                            "Unknown query parameters",
                            unknownFields,
                        );
                    }
                }

                const qResult = schema.safeParse(queryObject);
                if (!qResult.success) {
                    const fields: Record<string, string> = {};
                    for (const issue of qResult.error.issues) {
                        fields[issue.path.join(".") || "_"] = issue.message;
                    }
                    return errorJson(
                        400,
                        "INVALID_QUERY",
                        "Invalid query parameters",
                        fields,
                    );
                }
                parsedQuery = qResult.data as InferOrUndefined<Q>;
            }

            // --- parse body ---
            let parsedBody: InferOrUndefined<B> =
                undefined as InferOrUndefined<B>;

            if (options?.bodySchema) {
                let raw: unknown;
                try {
                    raw = await request.json();
                } catch {
                    return errorJson(
                        400,
                        "INVALID_BODY",
                        "Request body must be valid JSON",
                    );
                }

                const bResult = options.bodySchema.safeParse(raw);
                if (!bResult.success) {
                    const fields: Record<string, string> = {};
                    for (const issue of bResult.error.issues) {
                        fields[issue.path.join(".") || "_"] = issue.message;
                    }
                    return errorJson(
                        400,
                        "INVALID_BODY",
                        "Invalid request body",
                        fields,
                    );
                }
                parsedBody = bResult.data as InferOrUndefined<B>;
            }

            // --- call controller ---
            const params = rawParams as Record<string, string>;
            try {
                const result = await controller({
                    db,
                    params,
                    query: parsedQuery,
                    body: parsedBody,
                });

                if (result == null || result.body === undefined) {
                    return new HttpResponse(null, {
                        status: result?.status ?? 204,
                    });
                }
                return HttpResponse.json(result.body, {
                    status: result.status ?? 200,
                });
            } catch (err) {
                if (err instanceof ApiError) {
                    return errorJson(
                        err.status,
                        err.code,
                        err.message,
                        err.fields,
                    );
                }
                console.error(
                    "[warehouse-manager] Unhandled controller error:",
                    err,
                );
                return errorJson(
                    500,
                    "INTERNAL_ERROR",
                    "An unexpected error occurred",
                );
            }
        };
    };
}
