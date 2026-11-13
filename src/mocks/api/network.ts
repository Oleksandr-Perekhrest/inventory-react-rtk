export type NetworkConfig = {
    delay: [min: number, max: number] | 0;
    errorMode: () => "off" | "random";
    errorRate: number;
    failRequests: () => string[];
    random: () => number;
};

const NETWORK_KEY = "warehouse-manager:network";

function readNetworkSettings(): Record<string, unknown> {
    try {
        const raw = localStorage.getItem(NETWORK_KEY);
        if (!raw) return {};
        const parsed: unknown = JSON.parse(raw);
        if (
            typeof parsed !== "object" ||
            parsed === null ||
            Array.isArray(parsed)
        )
            return {};
        return parsed as Record<string, unknown>;
    } catch {
        return {};
    }
}

export function getErrorMode(): "off" | "random" {
    return readNetworkSettings()["errorMode"] === "random" ? "random" : "off";
}

export function setErrorMode(mode: "off" | "random"): void {
    try {
        const existing = readNetworkSettings();
        localStorage.setItem(
            NETWORK_KEY,
            JSON.stringify({ ...existing, errorMode: mode }),
        );
    } catch {
        // storage unavailable — ignore
    }
}

export function matchesFailRule(
    method: string,
    pathname: string,
    rule: string,
): boolean {
    const spaceIdx = rule.indexOf(" ");
    if (spaceIdx === -1) return false;
    const ruleMethod = rule.slice(0, spaceIdx);
    const rulePath = rule.slice(spaceIdx + 1);

    if (ruleMethod.toLowerCase() !== method.toLowerCase()) return false;

    const ruleSegments = rulePath.split("/").filter((s) => s.length > 0);
    const pathSegments = pathname.split("/").filter((s) => s.length > 0);

    if (ruleSegments.length !== pathSegments.length) return false;

    return ruleSegments.every(
        (seg, i) => seg === "*" || seg === pathSegments[i],
    );
}

// E2E tests set failRequests via localStorage to force failures on specific routes
export function getFailRequests(): string[] {
    const val = readNetworkSettings()["failRequests"];
    if (!Array.isArray(val)) return [];
    return val.filter((item): item is string => typeof item === "string");
}

export const defaultNetwork: NetworkConfig = {
    delay: [300, 700],
    errorRate: 0.2,
    random: () => Math.random(),
    errorMode: getErrorMode,
    failRequests: getFailRequests,
};
