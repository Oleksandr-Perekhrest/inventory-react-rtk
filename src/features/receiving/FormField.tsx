// outsource dependencies
import type { ReactNode } from "react";

// local dependencies
import { Label } from "@/components/ui/label";

type ChildProps = {
    id: string;
    "aria-invalid": true | undefined;
    "aria-describedby": string | undefined;
};

type FormFieldProps = {
    name: string;
    label: string;
    error?: string;
    children: (props: ChildProps) => ReactNode;
};

export function FormField({ name, label, error, children }: FormFieldProps) {
    const errorId = `${name}-error`;
    const hasError = Boolean(error);
    return (
        <div className="flex flex-col gap-1.5">
            <Label htmlFor={name}>{label}</Label>
            {children({
                id: name,
                "aria-invalid": hasError || undefined,
                "aria-describedby": hasError ? errorId : undefined,
            })}
            {hasError && (
                <p id={errorId} className="text-sm text-destructive">
                    {error}
                </p>
            )}
        </div>
    );
}
