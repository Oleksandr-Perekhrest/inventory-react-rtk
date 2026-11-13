// outsource dependencies
import { createFileRoute } from "@tanstack/react-router";

// local dependencies
import { WelcomePage } from "@/features/welcome/WelcomePage";

export const Route = createFileRoute("/")({
    component: WelcomePage,
});
