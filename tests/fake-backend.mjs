// Simulated API for the axios adapter: tracks calls and answers like the
// real backend's auth layer (401 + code for access-token problems).
import axios, { AxiosError } from "axios";

export const createFakeBackend = () => {
    const state = {
        access: "valid",      // "valid" | "expired" | "invalid" | "forbidden"
        refresh: "ok",        // "ok" | "401" | "network" | "500"
        retryStays401: false, // replayed request still 401s after a refresh
        calls: [],
        refreshDelayMs: 20,
    };

    const reply = (config, status, data) => {
        const response = { status, statusText: String(status), data, headers: {}, config, request: {} };
        if (status >= 400) {
            throw new AxiosError(`Request failed with status code ${status}`, AxiosError.ERR_BAD_REQUEST, config, {}, response);
        }
        return response;
    };

    const adapter = async (config) => {
        // The path the request really hits (baseURL joined the way axios does),
        // so a malformed join like "/api//auth/logout" fails the matches below.
        const url = new URL(axios.getUri(config)).pathname;
        state.calls.push(url);

        if (url === "/api/auth/refresh") {
            await new Promise((r) => setTimeout(r, state.refreshDelayMs));
            if (state.refresh === "network") {
                throw new AxiosError("Network Error", AxiosError.ERR_NETWORK, config, {});
            }
            if (state.refresh === "500") return reply(config, 500, { message: "boom" });
            if (state.refresh === "401") {
                return reply(config, 401, { message: "Refresh token expired", code: "REFRESH_INVALID" });
            }
            state.access = "valid";
            return reply(config, 200, { message: "Token refreshed", status: true });
        }

        if (url === "/api/auth/logout") return reply(config, 200, { status: true });

        const timesSeen = state.calls.filter((c) => c === url).length;
        if (state.access === "expired" || (state.retryStays401 && timesSeen > 1)) {
            return reply(config, 401, { message: "Invalid token", code: "TOKEN_EXPIRED" });
        }
        if (state.access === "invalid") return reply(config, 401, { message: "Invalid token", code: "TOKEN_INVALID" });
        if (state.access === "revoked") return reply(config, 401, { message: "Your session has ended", code: "SESSION_REVOKED" });
        if (state.access === "forbidden") return reply(config, 403, { message: "Admin permission required" });

        return reply(config, 200, { ok: true, url });
    };

    return { state, adapter, count: (url) => state.calls.filter((c) => c === url).length };
};

export const installAdapter = (instance, adapter) => {
    instance.defaults.adapter = adapter;
    axios.defaults.adapter = adapter; // raw axios is used for the logout call
};
