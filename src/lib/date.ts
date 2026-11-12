export function toLocalIsoDate(date: Date): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
}

export function combineLocalDateWithTime(date: string, time: Date): string {
    const parts = date.split("-");
    const year = Number(parts[0] ?? "0");
    const month = Number(parts[1] ?? "0") - 1;
    const day = Number(parts[2] ?? "0");
    return new Date(
        year,
        month,
        day,
        time.getHours(),
        time.getMinutes(),
        time.getSeconds(),
        time.getMilliseconds(),
    ).toISOString();
}
