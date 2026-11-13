// outsource dependencies
import { expect } from "@playwright/test";
import type { Page } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

export async function expectNoA11yViolations(
    page: Page,
    context: string,
): Promise<void> {
    const results = await new AxeBuilder({ page })
        .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
        .analyze();

    if (results.violations.length === 0) return;

    const lines = results.violations.map((v) => {
        const targets = v.nodes
            .slice(0, 5)
            .map((n) => n.target.join(" > "))
            .join("\n    ");
        return `[${v.id}] impact=${v.impact} — ${v.help}\n  targets:\n    ${targets}`;
    });

    expect(
        results.violations,
        `${context}: ${results.violations.length} accessibility violation(s):\n\n${lines.join("\n\n")}`,
    ).toHaveLength(0);
}
