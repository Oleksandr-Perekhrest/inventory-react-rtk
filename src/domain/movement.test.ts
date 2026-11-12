// outsource dependencies
import { it, expect, describe } from "vitest";

// local dependencies
import { MovementSchema } from "./movement";

const receipt = {
    id: "mov-00001",
    type: "receipt" as const,
    productId: "prod-001",
    quantity: 10,
    date: "2024-01-15T10:00:00Z",
    reference: "INV-SUP001-20240115",
    supplierId: "sup-001",
};

describe("MovementSchema", () => {
    describe("receipt", () => {
        it("accepts a valid receipt with positive quantity and supplierId", () => {
            expect(MovementSchema.safeParse(receipt).success).toBe(true);
        });

        it("accepts receipt with quantity 0", () => {
            expect(
                MovementSchema.safeParse({ ...receipt, quantity: 0 }).success,
            ).toBe(true);
        });

        it("accepts receipt with no expectedQuantity (seed movement, no discrepancy check)", () => {
            expect(MovementSchema.safeParse({ ...receipt }).success).toBe(true);
        });

        it("rejects when expectedQuantity differs from quantity and no discrepancyNote", () => {
            const result = MovementSchema.safeParse({
                ...receipt,
                quantity: 10,
                expectedQuantity: 5,
            });
            expect(result.success).toBe(false);
            if (!result.success) {
                expect(
                    result.error.issues.some(
                        (i) => i.path[0] === "discrepancyNote",
                    ),
                ).toBe(true);
            }
        });

        it("accepts when expectedQuantity differs from quantity and discrepancyNote is provided", () => {
            expect(
                MovementSchema.safeParse({
                    ...receipt,
                    quantity: 10,
                    expectedQuantity: 5,
                    discrepancyNote: "extra units found",
                }).success,
            ).toBe(true);
        });

        it("rejects discrepancyNote when expectedQuantity matches quantity", () => {
            const result = MovementSchema.safeParse({
                ...receipt,
                quantity: 10,
                expectedQuantity: 10,
                discrepancyNote: "should not be here",
            });
            expect(result.success).toBe(false);
            if (!result.success) {
                expect(
                    result.error.issues.some(
                        (i) => i.path[0] === "discrepancyNote",
                    ),
                ).toBe(true);
            }
        });

        it("rejects receipt with negative quantity", () => {
            const result = MovementSchema.safeParse({
                ...receipt,
                quantity: -5,
            });
            expect(result.success).toBe(false);
            if (!result.success) {
                expect(
                    result.error.issues.some((i) => i.path[0] === "quantity"),
                ).toBe(true);
            }
        });

        it("rejects receipt without supplierId", () => {
            const result = MovementSchema.safeParse({
                ...receipt,
                supplierId: undefined,
            });
            expect(result.success).toBe(false);
            if (!result.success) {
                expect(
                    result.error.issues.some((i) => i.path[0] === "supplierId"),
                ).toBe(true);
            }
        });
    });

    describe("shipment", () => {
        it("rejects shipment with positive quantity", () => {
            const result = MovementSchema.safeParse({
                ...receipt,
                type: "shipment" as const,
                quantity: 5,
                supplierId: undefined,
            });
            expect(result.success).toBe(false);
            if (!result.success) {
                expect(
                    result.error.issues.some((i) => i.path[0] === "quantity"),
                ).toBe(true);
            }
        });

        it("accepts shipment with negative quantity", () => {
            const result = MovementSchema.safeParse({
                ...receipt,
                type: "shipment" as const,
                quantity: -5,
                supplierId: undefined,
            });
            expect(result.success).toBe(true);
        });
    });

    describe("write-off", () => {
        it("rejects write-off with positive quantity", () => {
            const result = MovementSchema.safeParse({
                ...receipt,
                type: "write-off" as const,
                quantity: 5,
                supplierId: undefined,
            });
            expect(result.success).toBe(false);
            if (!result.success) {
                expect(
                    result.error.issues.some((i) => i.path[0] === "quantity"),
                ).toBe(true);
            }
        });

        it("accepts write-off with negative quantity", () => {
            const result = MovementSchema.safeParse({
                ...receipt,
                type: "write-off" as const,
                quantity: -5,
                supplierId: undefined,
            });
            expect(result.success).toBe(true);
        });
    });

    describe("adjustment", () => {
        it("accepts adjustment with positive quantity", () => {
            const result = MovementSchema.safeParse({
                ...receipt,
                type: "adjustment" as const,
                quantity: 5,
                supplierId: undefined,
            });
            expect(result.success).toBe(true);
        });

        it("accepts adjustment with negative quantity", () => {
            const result = MovementSchema.safeParse({
                ...receipt,
                type: "adjustment" as const,
                quantity: -5,
                supplierId: undefined,
            });
            expect(result.success).toBe(true);
        });
    });

    describe("expectedQuantity and discrepancyNote on non-receipts", () => {
        for (const type of ["shipment", "write-off", "adjustment"] as const) {
            const qty = type === "adjustment" ? 5 : -5;

            it(`rejects expectedQuantity on ${type}`, () => {
                const result = MovementSchema.safeParse({
                    ...receipt,
                    type,
                    quantity: qty,
                    supplierId: undefined,
                    expectedQuantity: 10,
                });
                expect(result.success).toBe(false);
                if (!result.success) {
                    expect(
                        result.error.issues.some(
                            (i) => i.path[0] === "expectedQuantity",
                        ),
                    ).toBe(true);
                }
            });

            it(`rejects discrepancyNote on ${type}`, () => {
                const result = MovementSchema.safeParse({
                    ...receipt,
                    type,
                    quantity: qty,
                    supplierId: undefined,
                    discrepancyNote: "should not be here",
                });
                expect(result.success).toBe(false);
                if (!result.success) {
                    expect(
                        result.error.issues.some(
                            (i) => i.path[0] === "discrepancyNote",
                        ),
                    ).toBe(true);
                }
            });
        }
    });

    describe("quantity zero", () => {
        for (const type of ["shipment", "write-off", "adjustment"] as const) {
            it(`rejects quantity 0 for ${type}`, () => {
                const result = MovementSchema.safeParse({
                    ...receipt,
                    type,
                    quantity: 0,
                });
                expect(result.success).toBe(false);
                if (!result.success) {
                    expect(
                        result.error.issues.some(
                            (i) => i.path[0] === "quantity",
                        ),
                    ).toBe(true);
                }
            });
        }
    });

    describe("date", () => {
        it("accepts a date string with Z timezone", () => {
            const result = MovementSchema.safeParse({
                ...receipt,
                date: "2024-01-15T10:00:00Z",
            });
            expect(result.success).toBe(true);
        });

        it("rejects a date string with +02:00 offset", () => {
            const result = MovementSchema.safeParse({
                ...receipt,
                date: "2024-01-15T10:00:00+02:00",
            });
            expect(result.success).toBe(false);
            if (!result.success) {
                expect(
                    result.error.issues.some((i) => i.path[0] === "date"),
                ).toBe(true);
            }
        });
    });

    describe("expiresAt", () => {
        it("accepts expiresAt as a plain date string", () => {
            const result = MovementSchema.safeParse({
                ...receipt,
                expiresAt: "2024-02-15",
            });
            expect(result.success).toBe(true);
        });

        it("rejects expiresAt with a time part", () => {
            const result = MovementSchema.safeParse({
                ...receipt,
                expiresAt: "2024-02-15T00:00:00Z",
            });
            expect(result.success).toBe(false);
            if (!result.success) {
                expect(
                    result.error.issues.some((i) => i.path[0] === "expiresAt"),
                ).toBe(true);
            }
        });
    });
});
