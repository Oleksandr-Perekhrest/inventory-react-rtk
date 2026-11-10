// local dependencies
import type { Category } from "@/domain";
import { ROOT, type VisibleNode } from "./tree";

type CategoryId = Category["id"];

type FocusAction = { type: "focus"; id: CategoryId };
type ToggleAction = { type: "toggle"; id: CategoryId };
export type SelectAction = { type: "select"; id: CategoryId };
type NoneAction = { type: "none" };

export type KeyAction = FocusAction | ToggleAction | SelectAction | NoneAction;

const NONE: NoneAction = { type: "none" };

export function getKeyAction(
    order: VisibleNode[],
    currentId: CategoryId | null,
    key: string,
    searchActive: boolean,
    names?: Map<CategoryId, string>,
): KeyAction {
    if (order.length === 0) return NONE;

    const idx =
        currentId == null ? -1 : order.findIndex((n) => n.id === currentId);

    if (idx === -1) {
        if (
            key === "ArrowDown" ||
            key === "ArrowUp" ||
            key === "Home" ||
            key === "End" ||
            key === "ArrowLeft" ||
            key === "ArrowRight" ||
            key === "Enter" ||
            key === " " ||
            isPrintable(key)
        ) {
            return { type: "focus", id: order[0].id };
        }
        return NONE;
    }

    const node = order[idx];

    switch (key) {
        case "ArrowDown": {
            const next = order[idx + 1];
            return next ? { type: "focus", id: next.id } : NONE;
        }
        case "ArrowUp": {
            const prev = order[idx - 1];
            return prev ? { type: "focus", id: prev.id } : NONE;
        }
        case "Home":
            return { type: "focus", id: order[0].id };
        case "End":
            return { type: "focus", id: order[order.length - 1].id };
        case "ArrowRight": {
            if (node.hasChildren) {
                if (node.expanded) {
                    const firstChild = order[idx + 1];
                    return firstChild
                        ? { type: "focus", id: firstChild.id }
                        : NONE;
                }
                if (searchActive) {
                    const firstChild = order[idx + 1];
                    return firstChild
                        ? { type: "focus", id: firstChild.id }
                        : NONE;
                }
                return { type: "toggle", id: node.id };
            }
            return NONE;
        }
        case "ArrowLeft": {
            if (node.expanded && !searchActive) {
                return { type: "toggle", id: node.id };
            }
            if (node.parentId === ROOT) return NONE;
            const parentNode = order.find((n) => n.id === node.parentId);
            return parentNode ? { type: "focus", id: parentNode.id } : NONE;
        }
        case "Enter":
        case " ": {
            return { type: "select", id: node.id };
        }
        default: {
            if (!isPrintable(key)) return NONE;
            const char = key.toLowerCase();
            const after = [...order.slice(idx + 1), ...order.slice(0, idx)];
            const match = after.find((n) => {
                const name = names?.get(n.id);
                return name ? name.toLowerCase().startsWith(char) : false;
            });
            return match ? { type: "focus", id: match.id } : NONE;
        }
    }
}

function isPrintable(key: string): boolean {
    return key.length === 1 && key !== " ";
}
