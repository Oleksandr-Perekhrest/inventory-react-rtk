let currentReady: Promise<void> = Promise.resolve();

export function setBackendReady(promise: Promise<void>): void {
    currentReady = promise;
}

export function waitForBackend(): Promise<void> {
    return currentReady;
}
