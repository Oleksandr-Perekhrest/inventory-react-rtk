// outsource dependencies
import { createFileRoute } from "@tanstack/react-router";

// local dependencies
import { ReceivingWizard } from "../features/receiving/ReceivingWizard";

export const Route = createFileRoute("/receiving")({
    component: ReceivingWizard,
});
