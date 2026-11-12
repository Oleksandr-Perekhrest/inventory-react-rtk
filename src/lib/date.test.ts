// outsource dependencies
import { it, expect, describe } from "vitest";

// local dependencies
import { toLocalIsoDate } from "./date";

describe("toLocalIsoDate", () => {
    it("formats a local date using local time, not UTC", () => {
        // new Date(year, monthIndex, day, hours, minutes) uses local time
        const d = new Date(2026, 10, 12, 0, 30); // Nov 12 2026, 00:30 local
        expect(toLocalIsoDate(d)).toBe("2026-11-12");
    });

    it("zero-pads single-digit month", () => {
        const d = new Date(2026, 0, 5); // Jan 5 2026
        expect(toLocalIsoDate(d)).toBe("2026-01-05");
    });

    it("zero-pads single-digit day", () => {
        const d = new Date(2026, 11, 3); // Dec 3 2026
        expect(toLocalIsoDate(d)).toBe("2026-12-03");
    });

    it("handles end-of-year boundary", () => {
        const d = new Date(2026, 11, 31); // Dec 31 2026
        expect(toLocalIsoDate(d)).toBe("2026-12-31");
    });
});
