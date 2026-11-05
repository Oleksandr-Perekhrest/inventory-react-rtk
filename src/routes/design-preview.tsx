// outsource dependencies
import { createFileRoute } from "@tanstack/react-router";

// local dependencies
import { DesignPreviewPage } from "@/components/design-preview/DesignPreviewPage";

export const Route = createFileRoute("/design-preview")({
    component: DesignPreviewPage,
});
