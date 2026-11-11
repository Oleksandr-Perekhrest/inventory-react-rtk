// outsource dependencies
import { useRef } from "react";
import { MoreHorizontal } from "lucide-react";

// local dependencies
import type { Product } from "@/domain";
import { Button } from "@/components/ui/button";
import { useProductMove } from "./ProductMoveContext";
import {
    DropdownMenu,
    DropdownMenuItem,
    DropdownMenuContent,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

type Props = {
    product: Product;
};

export function ProductActionsMenu({ product }: Props) {
    const triggerRef = useRef<HTMLButtonElement>(null);
    const { requestMove } = useProductMove();

    return (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                {/* Distance(6) constraint in dnd-kit already prevents accidental drags from a click */}
                <Button
                    ref={triggerRef}
                    variant="ghost"
                    size="icon"
                    aria-label={`Actions for ${product.name}`}
                >
                    <MoreHorizontal aria-hidden="true" className="size-4" />
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent>
                <DropdownMenuItem
                    onSelect={() => {
                        if (triggerRef.current) {
                            requestMove(product, triggerRef.current);
                        }
                    }}
                >
                    Move to category…
                </DropdownMenuItem>
            </DropdownMenuContent>
        </DropdownMenu>
    );
}
