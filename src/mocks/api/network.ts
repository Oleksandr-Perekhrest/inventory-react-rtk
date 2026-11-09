export type NetworkConfig = {
    delay: [min: number, max: number] | 0;
    errorMode: () => "off" | "random";
    errorRate: number;
    random: () => number;
};

const NETWORK_KEY = "warehouse-manager:network";

export function getErrorMode(): "off" | "random" {
    try {
        const raw = localStorage.getItem(NETWORK_KEY);
        if (!raw) return "off";
        const parsed: unknown = JSON.parse(raw);
        if (
            typeof parsed === "object" &&
            parsed !== null &&
            "errorMode" in parsed &&
            (parsed as Record<string, unknown>)["errorMode"] === "random"
        ) {
            return "random";
        }
        return "off";
    } catch {
        return "off";
    }
}

export function setErrorMode(mode: "off" | "random"): void {
    try {
        localStorage.setItem(NETWORK_KEY, JSON.stringify({ errorMode: mode }));
    } catch {
        // storage unavailable — ignore
    }
}

export const defaultNetwork: NetworkConfig = {
    delay: [300, 700],
    errorRate: 0.2,
    random: () => Math.random(),
    errorMode: getErrorMode,
};
