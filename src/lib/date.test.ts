// outsource dependencies
import { it, vi, expect, describe, afterEach } from "vitest";

// local dependencies
import { toLocalIsoDate, combineLocalDateWithTime } from "./date";

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

// ---------------------------------------------------------------------------
// combineLocalDateWithTime
// ---------------------------------------------------------------------------

describe("combineLocalDateWithTime", () => {
    afterEach(() => {
        vi.unstubAllEnvs();
    });

    it("maps the input date and local time to the correct local date in UTC+14", () => {
        vi.stubEnv("TZ", "Pacific/Kiritimati");
        // new Date(year, month, day, h, m) uses local time — in UTC+14 this is Nov 12 01:30 local
        const time = new Date(2026, 10, 12, 1, 30, 0, 0);
        const result = combineLocalDateWithTime("2026-11-12", time);
        const parsed = new Date(result);
        expect(parsed.getFullYear()).toBe(2026);
        expect(parsed.getMonth()).toBe(10); // 0-indexed: November
        expect(parsed.getDate()).toBe(12);
        expect(parsed.getHours()).toBe(1);
        expect(parsed.getMinutes()).toBe(30);
    });

    it("control: local date stays the input date even when the time argument's UTC date is on the prior calendar day (UTC+14)", () => {
        vi.stubEnv("TZ", "Pacific/Kiritimati");
        // This ISO string is always parsed as UTC, so this Date is UTC Nov 11 11:30.
        // In UTC+14 that is local Nov 12 01:30 — so time.toISOString() gives "2026-11-11T…"
        // while time.getDate() gives 12 (local). A naive implementation using
        // date + time.toISOString().slice(10) would produce "2026-11-12T11:30:00.000Z",
        // which parses back to local Nov 13 — wrong.
        const time = new Date("2026-11-11T11:30:00Z");
        const result = combineLocalDateWithTime("2026-11-12", time);
        const parsed = new Date(result);
        expect(parsed.getDate()).toBe(12); // local date is Nov 12, not Nov 11 (UTC)
        expect(parsed.getHours()).toBe(1);
        expect(parsed.getMinutes()).toBe(30);
    });
});
