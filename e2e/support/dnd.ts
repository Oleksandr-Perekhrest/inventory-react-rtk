// outsource dependencies
import { expect, type Page, type Locator } from "@playwright/test";

// CatalogDndProvider configures the PointerSensor with a 6 px activation
// distance; 12 px keeps us past that while staying inside the source element.
const ACTIVATION_NUDGE = 12;

/**
 * Simulates a pointer drag from the centre of `source` to the centre of `target`.
 * Waits for the drag overlay to actually appear before travelling to the target,
 * so the move is only dispatched once the sensor has activated.
 */
export async function dragOnto(
    page: Page,
    source: Locator,
    target: Locator,
): Promise<void> {
    const srcBox = await source.boundingBox();
    const tgtBox = await target.boundingBox();
    if (!srcBox || !tgtBox) {
        throw new Error("dragOnto: source or target has no bounding box");
    }

    const sx = srcBox.x + srcBox.width / 2;
    const sy = srcBox.y + srcBox.height / 2;
    const tx = tgtBox.x + tgtBox.width / 2;
    const ty = tgtBox.y + tgtBox.height / 2;

    await page.mouse.move(sx, sy);
    await page.mouse.down();
    await page.mouse.move(sx + ACTIVATION_NUDGE, sy, { steps: 4 });

    // DragOverlay renders [data-dnd-overlay]; it only has children once a drag
    // source is active, so this is the activation signal.
    await expect(page.locator("[data-dnd-overlay] > *")).toBeVisible();

    await page.mouse.move(tx, ty, { steps: 12 });
    await page.mouse.up();
}
