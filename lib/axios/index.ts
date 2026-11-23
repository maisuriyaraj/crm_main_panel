import axios, { type AxiosError, type InternalAxiosRequestConfig } from "axios";
import { API_BASE_URL, apiRoutes } from "@/lib/constants";
import {
    endImpersonatedSession,
    endSession,
    getSessionSignal,
    isHeldForMfaStep,
    isImpersonating,
    isSessionEnded,
} from "@/lib/auth/session";

// Auth lives entirely in HttpOnly cookies set by the backend; the browser
// attaches them via withCredentials, so no token is ever read or stored here.
export const Axios = axios.create({
    baseURL: API_BASE_URL,
    withCredentials: true,
});

// These never get a refresh-and-retry: login/logout and the MFA sign-in steps
// don't take an access token (the steps carry their own MFA token), and a
// failing refresh call must not refresh itself.
const NO_REFRESH_ENDPOINTS: string[] = [
    apiRoutes.login, apiRoutes.refreshToken, apiRoutes.logout,
    apiRoutes.mfaEnrollStart, apiRoutes.mfaEnrollConfirm, apiRoutes.mfaVerify,
];

// Only an expired or absent access token is worth a refresh. A forged or
// wrong-scope token ("TOKEN_INVALID"), a 403 or a 400 is not.
const REFRESHABLE_CODES = ["TOKEN_EXPIRED", "TOKEN_MISSING"];

type RetriableConfig = InternalAxiosRequestConfig & { _retry?: boolean };

// A 403 FORBIDDEN means the caller's role changed since /me was read. The
// AuthGuard registers a listener that re-reads /me so menus and buttons catch
// up; kept as a callback because the store imports this module.
let forbiddenListener: (() => void) | null = null;
export const setForbiddenListener = (listener: (() => void) | null) => {
    forbiddenListener = listener;
};

// A 403 SUBSCRIPTION_INACTIVE means the organization's subscription has ended:
// modules are closed but team and settings still work. The workspace layout
// registers a listener that shows the "subscription has ended" screen.
let subscriptionInactiveListener: ((status: string | null) => void) | null = null;
export const setSubscriptionInactiveListener = (listener: ((status: string | null) => void) | null) => {
    subscriptionInactiveListener = listener;
};

// A 403 IMPERSONATION_RESTRICTED means the server refused something a support
// session may never do. Screens hide most of those actions, but anything that
// slips through still has to say why, so the banner shows a notice.
let impersonationRestrictedListener: ((message: string) => void) | null = null;
export const setImpersonationRestrictedListener = (listener: ((message: string) => void) | null) => {
    impersonationRestrictedListener = listener;
};

Axios.interceptors.request.use((config) => {
    if (isSessionEnded()) {
        return Promise.reject(new axios.CanceledError("Session ended"));
    }
    config.signal ??= getSessionSignal();
    return config;
});

// Single-flight: however many requests 401 at once, they all wait on the
// same refresh call instead of each rotating the refresh token.
let refreshPromise: Promise<void> | null = null;

const refreshSession = () => {
    if (!refreshPromise) {
        refreshPromise = Axios.post(apiRoutes.refreshToken)
            .then(() => undefined)
            .finally(() => {
                refreshPromise = null;
            });
    }
    return refreshPromise;
};

Axios.interceptors.response.use(
    (response) => response,
    async (error: AxiosError<{ code?: string; subscription_status?: string; reason?: string; message?: string }>) => {
        const originalRequest = error.config as RetriableConfig | undefined;

        // The support session is over (ended, expired, or the staff account was
        // closed). It has no refresh token, so there is nothing to revive.
        if (error.response?.status === 401 && error.response.data?.code === "IMPERSONATION_ENDED") {
            endImpersonatedSession(error.response.data.reason ?? null);
            return Promise.reject(error);
        }

        if (error.response?.status === 403 && error.response.data?.code === "SUBSCRIPTION_INACTIVE") {
            subscriptionInactiveListener?.(error.response.data.subscription_status ?? null);
        }

        if (error.response?.status === 403 && error.response.data?.code === "IMPERSONATION_RESTRICTED") {
            impersonationRestrictedListener?.(
                error.response.data.message
                || "Support sessions can't do this. Ask someone in this workspace to do it themselves.",
            );
        }

        if (
            error.response?.status === 403 &&
            error.response.data?.code === "FORBIDDEN" &&
            originalRequest?.url !== apiRoutes.me
        ) {
            forbiddenListener?.();
        }

        // The server ended this session (logout elsewhere, password change,
        // suspension). A refresh can't revive it, so leave right away.
        if (error.response?.status === 401 && error.response.data?.code === "SESSION_REVOKED") {
            void endSession();
            return Promise.reject(error);
        }

        // A support session is issued without a refresh token on purpose, and the
        // browser may still hold the member's own one: refreshing here would
        // quietly turn a 30-minute audited session into their real one.
        if (error.response?.status === 401 && isImpersonating()) {
            endImpersonatedSession("expired");
            return Promise.reject(error);
        }

        if (
            !originalRequest ||
            error.response?.status !== 401 ||
            originalRequest._retry ||
            isSessionEnded() ||
            NO_REFRESH_ENDPOINTS.includes(originalRequest.url ?? "") ||
            !REFRESHABLE_CODES.includes(error.response.data?.code ?? "")
        ) {
            return Promise.reject(error);
        }

        originalRequest._retry = true;

        try {
            await refreshSession();
        } catch (refreshError) {
            // Only a 401 from the refresh endpoint proves the session is over.
            // Offline, timeouts and 5xx leave the session alone so a blip
            // doesn't sign anyone out.
            if (axios.isAxiosError(refreshError) && refreshError.response?.status === 401 && !isHeldForMfaStep()) {
                void endSession();
            }
            return Promise.reject(error);
        }

        // The refresh response already replaced the cookies; replay once.
        return Axios(originalRequest);
    },
);
