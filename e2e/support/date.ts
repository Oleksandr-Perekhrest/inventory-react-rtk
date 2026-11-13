/** Formats a Date as YYYY-MM-DD in local time, matching src/lib/date.ts toLocalIsoDate. */
export function localIsoDate(date: Date): string {
    const pad = (n: number) => String(n).padStart(2, "0");
    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}
