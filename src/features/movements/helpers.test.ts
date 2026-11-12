// outsource dependencies
import { it, vi, expect, describe, afterEach } from "vitest";

// local dependencies
import type { MovementListItem } from "@/api/types";
import {
    hasDetails,
    presetRange,
    discrepancyKind,
    formatSignedQuantity,
    formatQuantityWithUnit,
} from "./helpers";

const baseItem: MovementListItem = {
    id: "1",
    type: "shipment",
    productId: "p1",
    quantity: -10,
    date: "2026-01-01T00:00:00.000Z",
    reference: "REF-001",
    product: { id: "p1", name: "Widget", sku: "W-001", unit: "kg" },
    supplier: null,
};

describe("formatSignedQuantity", () => {
    it("positive: prefixes with +", () => {
        expect(formatSignedQuantity(50, "kg")).toBe("+50 kg");
    });

    it("negative: uses U+2212 real minus sign", () => {
        expect(formatSignedQuantity(-50, "kg")).toBe("−50 kg");
    });

    it("zero: no sign prefix", () => {
        expect(formatSignedQuantity(0, "kg")).toBe("0 kg");
    });

    it("fractional: keeps decimal part", () => {
        expect(formatSignedQuantity(40.5, "kg")).toBe("+40.5 kg");
    });
});

describe("formatQuantityWithUnit", () => {
    it("formats without sign", () => {
        expect(formatQuantityWithUnit(48, "kg")).toBe("48 kg");
    });
});

describe("discrepancyKind", () => {
    it("below expected: short", () => {
        expect(discrepancyKind(90, 100)).toBe("short");
    });

    it("above expected: over", () => {
        expect(discrepancyKind(110, 100)).toBe("over");
    });
});

describe("hasDetails", () => {
    it("plain shipment: false", () => {
        expect(hasDetails(baseItem)).toBe(false);
    });

    it("with batch: true", () => {
        expect(hasDetails({ ...baseItem, batch: "LOT-001" })).toBe(true);
    });

    it("expectedQuantity !== quantity: true", () => {
        expect(hasDetails({ ...baseItem, expectedQuantity: 100 })).toBe(true);
    });

    it("expectedQuantity === quantity: false", () => {
        expect(
            hasDetails({ ...baseItem, quantity: 10, expectedQuantity: 10 }),
        ).toBe(false);
    });
});

describe("presetRange", () => {
    it("7 days on 2026-11-12: from 2026-11-06 to 2026-11-12", () => {
        const today = new Date(2026, 10, 12, 0, 30);
        expect(presetRange(7, today)).toEqual({
            from: "2026-11-06",
            to: "2026-11-12",
        });
    });

    it("7 days on 2026-03-03: crosses month boundary to 2026-02-25", () => {
        const today = new Date(2026, 2, 3, 0, 30);
        expect(presetRange(7, today)).toEqual({
            from: "2026-02-25",
            to: "2026-03-03",
        });
    });
});

describe("formatLocalDate", () => {
    afterEach(() => {
        vi.unstubAllEnvs();
    });

    it("formats using local time (America/Los_Angeles): 2026-11-20 → 20 Nov 2026", async () => {
        vi.stubEnv("TZ", "America/Los_Angeles");
        // Re-import after stubbing so the module-level Intl.DateTimeFormat is constructed in the new zone.
        vi.resetModules();
        const { formatLocalDate: fmt } = await import("./helpers");
        expect(fmt("2026-11-20")).toContain("20 Nov 2026");
    });
});
