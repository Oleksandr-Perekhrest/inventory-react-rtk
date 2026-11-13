// outsource dependencies
import { ExternalLink } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { Link, type LinkProps } from "@tanstack/react-router";

// local dependencies
import { Button } from "@/components/ui/button";
import { navIcons } from "@/components/layout/navItems";
import { Card, CardTitle, CardHeader, CardContent } from "@/components/ui/card";

type TryCard = {
    to: LinkProps["to"];
    title: string;
    description: string;
    icon: LucideIcon;
};

const tryCards: TryCard[] = [
    {
        to: "/receiving",
        title: "Receive goods",
        description:
            "Post a receipt, then see the dashboard and the journal update without reloading.",
        icon: navIcons.receiving,
    },
    {
        to: "/catalog",
        title: "Organize the catalog",
        description:
            "Drag a category or a product in the tree, or filter the table by low stock.",
        icon: navIcons.catalog,
    },
    {
        to: "/movements",
        title: "Trace movements",
        description:
            "Filter by type, product and dates, then copy the URL: the filters travel with it.",
        icon: navIcons.movements,
    },
    {
        to: "/dashboard",
        title: "Check the dashboard",
        description:
            "Stock value, low-stock products and 30 days of inflow and outflow.",
        icon: navIcons.dashboard,
    },
];

export function WelcomePage() {
    return (
        <div className="space-y-8 p-4 lg:p-6">
            <div>
                <h1 className="text-2xl font-semibold">Warehouse Manager</h1>
                <p className="text-sm text-muted-foreground">
                    An admin app for a small warehouse that follows a product
                    from receiving to stock, built as a portfolio project.
                </p>
            </div>

            <section className="space-y-4">
                <h2 className="text-xl font-semibold">What to try</h2>
                <div className="grid gap-4 md:grid-cols-2">
                    {tryCards.map(({ to, title, description, icon: Icon }) => (
                        <Link
                            key={String(to)}
                            to={to}
                            className="block rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring"
                        >
                            <Card className="h-full rounded-sm">
                                <CardHeader>
                                    <CardTitle>
                                        <div className="flex items-center gap-2">
                                            <Icon
                                                aria-hidden="true"
                                                className="size-5 shrink-0 text-muted-foreground"
                                            />
                                            {title}
                                        </div>
                                    </CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <p className="text-muted-foreground">
                                        {description}
                                    </p>
                                </CardContent>
                            </Card>
                        </Link>
                    ))}
                </div>
            </section>

            <section className="space-y-4">
                <h2 className="text-xl font-semibold">How it works</h2>
                <ul className="list-disc space-y-2 pl-5 text-sm text-muted-foreground">
                    <li>
                        There is no backend. The API is mocked in the browser by
                        MSW with a realistic delay.
                    </li>
                    <li>
                        Data is stored in this browser. Demo data is generated
                        on your first visit relative to that day, so "Reset demo
                        data" in the sidebar creates a fresh set.
                    </li>
                    <li>
                        "Simulate network errors" in the sidebar shows how every
                        screen handles failures.
                    </li>
                </ul>
            </section>

            <section className="space-y-4">
                <h2 className="text-xl font-semibold">Stack</h2>
                <p className="text-sm text-muted-foreground">
                    React, TypeScript, Redux Toolkit with RTK Query, TanStack
                    Router, TanStack Table, TanStack Form, Zod, shadcn/ui with
                    Tailwind, dnd-kit, Recharts, MSW, Vitest with Testing
                    Library.
                </p>
            </section>

            <div className="flex flex-wrap gap-3">
                <Button asChild>
                    <Link to="/dashboard">Open dashboard</Link>
                </Button>
                <Button variant="outline" asChild>
                    <a
                        href="https://github.com/Oleksandr-Perekhrest/inventory-react-rtk"
                        target="_blank"
                        rel="noopener noreferrer"
                    >
                        Source on GitHub
                        <ExternalLink aria-hidden="true" />
                        <span className="sr-only">(opens in a new tab)</span>
                    </a>
                </Button>
            </div>
        </div>
    );
}
