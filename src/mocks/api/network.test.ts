// outsource dependencies
import { it, expect, describe, afterEach } from "vitest";

// local dependencies
import {
    getErrorMode,
    setErrorMode,
    getFailRequests,
    matchesFailRule,
} from "./network";

const NETWORK_KEY = "warehouse-manager:network";

afterEach(() => {
    localStorage.clear();
});

describe("matchesFailRule", () => {
    it('exact rule "PATCH /api/products/p1" matches PATCH /api/products/p1', () => {
        expect(
            matchesFailRule(
                "PATCH",
                "/api/products/p1",
                "PATCH /api/products/p1",
            ),
        ).toBe(true);
    });

    it("control: same rule does not match /api/products/p2", () => {
        expect(
            matchesFailRule(
                "PATCH",
                "/api/products/p2",
                "PATCH /api/products/p1",
            ),
        ).toBe(false);
    });

    it('"*" matches one segment: POST /api/categories/*/move matches /api/categories/c7/move', () => {
        expect(
            matchesFailRule(
                "POST",
                "/api/categories/c7/move",
                "POST /api/categories/*/move",
            ),
        ).toBe(true);
    });

    it('"*" does not match two segments: same rule does not match /api/categories/a/b/move', () => {
        expect(
            matchesFailRule(
                "POST",
                "/api/categories/a/b/move",
                "POST /api/categories/*/move",
            ),
        ).toBe(false);
    });

    it('segment count mismatch: "PATCH /api/products/*" does not match /api/products', () => {
        expect(
            matchesFailRule("PATCH", "/api/products", "PATCH /api/products/*"),
        ).toBe(false);
    });

    it('method is case-insensitive: "post" rule matches POST request', () => {
        expect(
            matchesFailRule(
                "POST",
                "/api/categories/c7/move",
                "post /api/categories/*/move",
            ),
        ).toBe(true);
    });

    it("control: GET does not match a POST rule", () => {
        expect(
            matchesFailRule(
                "GET",
                "/api/categories/c7/move",
                "POST /api/categories/*/move",
            ),
        ).toBe(false);
    });

    it("a rule without a space returns false", () => {
        expect(
            matchesFailRule("GET", "/api/products", "GET/api/products"),
        ).toBe(false);
    });
});

describe("getFailRequests", () => {
    it("missing key returns []", () => {
        expect(getFailRequests()).toEqual([]);
    });

    it("invalid JSON returns []", () => {
        localStorage.setItem(NETWORK_KEY, "not-valid-json{{{");
        expect(getFailRequests()).toEqual([]);
    });

    it("an array at the root returns []", () => {
        localStorage.setItem(NETWORK_KEY, JSON.stringify(["rule1", "rule2"]));
        expect(getFailRequests()).toEqual([]);
    });

    it("non-string entries are dropped while string entries are kept", () => {
        localStorage.setItem(
            NETWORK_KEY,
            JSON.stringify({
                failRequests: ["valid", 123, null, "also-valid"],
            }),
        );
        expect(getFailRequests()).toEqual(["valid", "also-valid"]);
    });
});

describe("getErrorMode / setErrorMode", () => {
    it("default is off", () => {
        expect(getErrorMode()).toBe("off");
    });

    it("setErrorMode('random') keeps an existing failRequests array and an unrelated extra field", () => {
        localStorage.setItem(
            NETWORK_KEY,
            JSON.stringify({ failRequests: ["POST /api/foo"], extra: "bar" }),
        );
        setErrorMode("random");
        const stored: unknown = JSON.parse(
            localStorage.getItem(NETWORK_KEY) ?? "{}",
        );
        expect(stored).toEqual({
            extra: "bar",
            errorMode: "random",
            failRequests: ["POST /api/foo"],
        });
    });

    it("setErrorMode over invalid JSON writes { errorMode } only", () => {
        localStorage.setItem(NETWORK_KEY, "not-valid-json{{{");
        setErrorMode("random");
        const stored: unknown = JSON.parse(
            localStorage.getItem(NETWORK_KEY) ?? "{}",
        );
        expect(stored).toEqual({ errorMode: "random" });
    });
});
