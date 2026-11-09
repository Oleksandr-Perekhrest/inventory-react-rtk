// The RTK Query baseQuery will await mocksReady before every request.
export const mocksReady: Promise<void> = import("./browser")
    .then(({ worker }) => worker.start({ onUnhandledFrame: "bypass" }))
    .then(() => undefined);
