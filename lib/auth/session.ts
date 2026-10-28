import axios from "axios";
import { apiRoutes, apiUrl, pageRoutes } from "@/lib/constants";
import { handleCookieActions, handleLocalStorageActions } from "@/lib/commonFunctions";

// Lifetime of the routing hint below; matches the refresh token's 45 days.
const USER_HINT_MAX_AGE_S = 45 * 24 * 60 * 60;

type SignedInProfile = { organizationId: number | string; mustResetPassword?: boolean; email?: string };

// After sign-in: the proxy routes by the org id, and the invitation page
// compares the email. That is all the JS-readable `user` cookie carries;
// permissions and the rest of the profile stay out of every request.
export const rememberSignedInUser = (profile: SignedInProfile) => {
    handleLocalStorageActions("set", "user", profile);
    handleCookieActions("set", "user", {
        organizationId: profile.organizationId,
        mustResetPassword: !!profile.mustResetPassword,
        email: profile.email,
    }, { expires: USER_HINT_MAX_AGE_S });
};

// Device preferences that aren't tied to who is signed in survive a logout.
const PRESERVED_LOCAL_STORAGE_KEYS = ["theme"];

let sessionEnded = false;
// Every API request carries this signal, so ending the session cancels
// whatever is still in flight for the user who just left.
const pendingRequests = new AbortController();
const listeners = new Set<() => void>();

export type SessionEndReason = "expired" | "logout";

// Set by the mounted <SessionExpiredDialog />. It receives the final redirect
// and runs it once the user acknowledges the notice.
type ExpiredNoticeHandler = (acknowledge: () => void) => void;
let expiredNoticeHandler: ExpiredNoticeHandler | null = null;

export const registerExpiredNotice = (handler: ExpiredNoticeHandler) => {
    expiredNoticeHandler = handler;
    return () => {
        if (expiredNoticeHandler === handler) expiredNoticeHandler = null;
    };
};

export const isSessionEnded = () => sessionEnded;

export const getSessionSignal = () => pendingRequests.signal;

export const onSessionEnded = (listener: () => void) => {
    listeners.add(listener);
    return () => {
        listeners.delete(listener);
    };
};

// Only this origin's own storage is touched. The auth cookies themselves are
// HttpOnly and can only be removed by the backend's logout/refresh responses;
// `user` is the one cookie the client writes itself.
export const clearClientSession = () => {
    if (typeof window === "undefined") return;

    try {
        Object.keys(localStorage)
            .filter((key) => !PRESERVED_LOCAL_STORAGE_KEYS.includes(key))
            .forEach((key) => localStorage.removeItem(key));
    } catch {
        // Storage can be unavailable (privacy mode); nothing to clear then.
    }

    try {
        sessionStorage.clear();
    } catch {
        // Same as above.
    }

    handleCookieActions("remove", "user");
};

// The single exit for a dead or abandoned session. Idempotent: concurrent
// 401s, the auth guard and an explicit logout can all call it, but only the
// first runs cleanup and the one redirect. Neither landing page can bounce:
// "/" never redirects, and signin only redirects when the `user` cookie —
// cleared below — is present.
//
// "expired": cleanup happens first, then the user acknowledges a notice and
// goes to signin. "logout": the user asked for it, so straight to "/".
//
// The other tabs of this browser share the same cookies, so they are told
// too and run the same local cleanup — without calling the API again or
// re-broadcasting (`fromOtherTab`).
export const endSession = async (reason: SessionEndReason = "expired", { fromOtherTab = false } = {}) => {
    if (sessionEnded) return;
    sessionEnded = true;

    pendingRequests.abort();
    // Wipes Redux right away so protected content stops rendering before the
    // navigation completes.
    listeners.forEach((listener) => listener());

    if (!fromOtherTab) {
        announceToOtherTabs(reason);
        try {
            // Raw axios, not the shared instance, so this can never re-enter the
            // refresh interceptor. The backend clears the HttpOnly cookies here.
            await axios.post(apiUrl(apiRoutes.logout), null, {
                withCredentials: true,
                timeout: 5000,
            });
        } catch {
            // Best effort: if the API is unreachable the cookies may linger, but
            // they can't loop us — the session hint alone never forces a redirect
            // without the `user` cookie cleared below.
        }
    }

    clearClientSession();

    if (typeof window === "undefined") return;

    // A full navigation also drops every bit of in-memory user state.
    const redirect = (path: string) => () => window.location.replace(path);

    const signinTarget = signinWithReturnPath();

    // Without a mounted notice there's no one to acknowledge it, so redirect
    // right away rather than leave the user on a blank page.
    if (reason === "expired" && expiredNoticeHandler) {
        expiredNoticeHandler(redirect(signinTarget));
        return;
    }

    redirect(reason === "expired" ? signinTarget : pageRoutes.home)();
};

// After an expiry, sign-in sends the user back to the workspace page they
// were on (the sign-in page only honours same-org paths).
const signinWithReturnPath = () => {
    const path = typeof window !== "undefined" ? window.location.pathname : undefined;
    if (!path || path === "/" || path.startsWith("/auth/")) return pageRoutes.signin;
    return `${pageRoutes.signin}?redirect=${encodeURIComponent(`${path}${window.location.search || ""}`)}`;
};

// ─── Cross-tab sign-out ──────────────────────────────────────────────────────

const CHANNEL_NAME = "orbitops-auth";
const STORAGE_SIGNAL_KEY = "orbitops-auth-signal";

type TabMessage = { type: "session-ended"; reason: SessionEndReason };

const isTabMessage = (value: unknown): value is TabMessage =>
    !!value && (value as TabMessage).type === "session-ended"
    && ((value as TabMessage).reason === "expired" || (value as TabMessage).reason === "logout");

const channel: BroadcastChannel | null =
    typeof window !== "undefined" && typeof BroadcastChannel !== "undefined" ? new BroadcastChannel(CHANNEL_NAME) : null;

// Node's BroadcastChannel keeps the process alive; browsers have no unref.
(channel as unknown as { unref?: () => void } | null)?.unref?.();

const announceToOtherTabs = (reason: SessionEndReason) => {
    const message: TabMessage = { type: "session-ended", reason };
    if (channel) {
        channel.postMessage(message);
        return;
    }
    // Fallback for browsers without BroadcastChannel: a storage write fires a
    // `storage` event in every other tab of this origin.
    try {
        localStorage.setItem(STORAGE_SIGNAL_KEY, JSON.stringify({ ...message, at: Date.now() }));
    } catch {
        // Storage unavailable: other tabs find out on their next API call.
    }
};

if (channel) {
    channel.onmessage = (event: MessageEvent) => {
        if (isTabMessage(event.data)) void endSession(event.data.reason, { fromOtherTab: true });
    };
} else if (typeof window !== "undefined" && typeof window.addEventListener === "function") {
    window.addEventListener("storage", (event: StorageEvent) => {
        if (event.key !== STORAGE_SIGNAL_KEY || !event.newValue) return;
        try {
            const message = JSON.parse(event.newValue);
            if (isTabMessage(message)) void endSession(message.reason, { fromOtherTab: true });
        } catch {
            // Not ours or malformed: ignore.
        }
    });
}
