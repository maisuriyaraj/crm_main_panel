// "Set up later" holds for this browser tab's session only. sessionStorage is
// cleared at sign-out, so the next sign-in offers the wizard again until an admin
// finishes it. Only a UI choice is kept here, never account data.
const DEFER_KEY = "orbitops-setup-deferred";
const listeners = new Set<() => void>();

export const isSetupDeferred = () => {
    try {
        return sessionStorage.getItem(DEFER_KEY) === "1";
    } catch {
        return false;
    }
};

export const deferSetup = () => {
    try {
        sessionStorage.setItem(DEFER_KEY, "1");
    } catch {
        // Storage unavailable: the wizard simply opens again next time.
    }
    listeners.forEach((listener) => listener());
};

// For useSyncExternalStore: the workspace layout stays mounted across pages, so
// it has to hear about the choice when it is made.
export const subscribeToSetupDeferral = (listener: () => void) => {
    listeners.add(listener);
    return () => {
        listeners.delete(listener);
    };
};

// A path inside the workspace, without the organization segment ("/12/leads" -> "/leads").
export const workspacePath = (pathname: string) => {
    const [, , ...rest] = pathname.split("/");
    return `/${rest.join("/")}`;
};
