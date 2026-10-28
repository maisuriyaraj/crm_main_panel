import axios, { type AxiosError, type InternalAxiosRequestConfig } from "axios";
import { API_BASE_URL, apiRoutes } from "@/lib/constants";
import { endSession, getSessionSignal, isSessionEnded } from "@/lib/auth/session";

// Auth lives entirely in HttpOnly cookies set by the backend; the browser
// attaches them via withCredentials, so no token is ever read or stored here.
export const Axios = axios.create({
    baseURL: API_BASE_URL,
    withCredentials: true,
});

// These never get a refresh-and-retry: login/logout don't take an access
// token, and a failing refresh call must not refresh itself.
const NO_REFRESH_ENDPOINTS: string[] = [apiRoutes.login, apiRoutes.refreshToken, apiRoutes.logout];

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
    async (error: AxiosError<{ code?: string }>) => {
        const originalRequest = error.config as RetriableConfig | undefined;

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
            if (axios.isAxiosError(refreshError) && refreshError.response?.status === 401) {
                void endSession();
            }
            return Promise.reject(error);
        }

        // The refresh response already replaced the cookies; replay once.
        return Axios(originalRequest);
    },
);
