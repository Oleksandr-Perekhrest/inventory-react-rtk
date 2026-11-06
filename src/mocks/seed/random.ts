export function mulberry32(seed: number): () => number {
    let s = seed >>> 0;
    return () => {
        s = (s + 0x6d2b79f5) >>> 0;
        let t = Math.imul(s ^ (s >>> 15), 1 | s);
        t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) >>> 0;
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
}

export function makeRng(seed: number) {
    const rand = mulberry32(seed);
    const int = (min: number, max: number) =>
        Math.floor(rand() * (max - min + 1)) + min;
    const pick = <T>(arr: readonly T[]) => arr[Math.floor(rand() * arr.length)];
    return { rand, int, pick };
}
