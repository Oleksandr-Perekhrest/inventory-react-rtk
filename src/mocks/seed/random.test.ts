// outsource dependencies
import { it, expect, describe } from "vitest";

// local dependencies
import { makeRng, mulberry32 } from "./random";

describe("mulberry32", () => {
    it("produces the same sequence for the same seed", () => {
        const rng1 = mulberry32(42);
        const rng2 = mulberry32(42);
        const seq1 = Array.from({ length: 20 }, () => rng1());
        const seq2 = Array.from({ length: 20 }, () => rng2());
        expect(seq1).toEqual(seq2);
    });

    it("produces different sequences for different seeds", () => {
        const rng1 = mulberry32(42);
        const rng2 = mulberry32(43);
        const seq1 = Array.from({ length: 20 }, () => rng1());
        const seq2 = Array.from({ length: 20 }, () => rng2());
        expect(seq1).not.toEqual(seq2);
    });

    it("produces values in [0, 1)", () => {
        const rng = mulberry32(0xdeadbeef);
        for (let i = 0; i < 1000; i++) {
            const v = rng();
            expect(v).toBeGreaterThanOrEqual(0);
            expect(v).toBeLessThan(1);
        }
    });
});

describe("makeRng", () => {
    it("rand produces values in [0, 1)", () => {
        const { rand } = makeRng(0x5eed_b33f);
        for (let i = 0; i < 1000; i++) {
            const v = rand();
            expect(v).toBeGreaterThanOrEqual(0);
            expect(v).toBeLessThan(1);
        }
    });
});
