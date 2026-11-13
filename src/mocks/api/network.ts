export type NetworkConfig = {
    delay: [min: number, max: number] | 0;
    errorMode: () => "off" | "random";
    errorRate: number;
    failRequests: () => string[];
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
        const raw = localStorage.getItem(NETWORK_KEY);
        let existing: Record<string, unknown> = {};
        if (raw) {
            try {
                const parsed: unknown = JSON.parse(raw);
                if (typeof parsed === "object" && parsed !== null) {
                    existing = parsed as Record<string, unknown>;
                }
            } catch {
                // ignore
            }
        }
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
    try {
        const raw = localStorage.getItem(NETWORK_KEY);
        if (!raw) return [];
        const parsed: unknown = JSON.parse(raw);
        if (typeof parsed !== "object" || parsed === null) return [];
        const val = (parsed as Record<string, unknown>)["failRequests"];
        if (!Array.isArray(val)) return [];
        return val.filter((item): item is string => typeof item === "string");
    } catch {
        return [];
    }
}

export const defaultNetwork: NetworkConfig = {
    delay: [300, 700],
    errorRate: 0.2,
    random: () => Math.random(),
    errorMode: getErrorMode,
    failRequests: getFailRequests,
};
