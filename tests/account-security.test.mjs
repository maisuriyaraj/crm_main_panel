// Password rules mirror the backend, and the account-security calls hit the
// right endpoints and keep the sessions list in step with the API.
import "./ts-resolver.mjs";
import { test, beforeEach } from "node:test";
import assert from "node:assert/strict";
import axios, { AxiosError } from "axios";
import { installBrowserEnv } from "./browser-env.mjs";
import { installAdapter } from "./fake-backend.mjs";

installBrowserEnv();
const { Axios } = await import("../lib/axios/index.ts");
const { store } = await import("../lib/store/index.ts");
const policy = await import("../lib/auth/passwordPolicy.ts");
const { authErrorMessage } = await import("../lib/auth/errors.ts");
const security = await import("../lib/store/slices/accountSecuritySlice.ts");

let calls;
let routes;
const adapter = async (config) => {
    const url = new URL(axios.getUri(config)).pathname;
    const body = typeof config.data === "string" ? JSON.parse(config.data) : config.data;
    calls.push({ method: config.method.toUpperCase(), url, body });
    const handler = routes[`${config.method.toUpperCase()} ${url}`];
    const [status, data] = handler ? handler(body) : [404, { message: "no route" }];
    const response = { status, statusText: String(status), data, headers: {}, config, request: {} };
    if (status >= 400) throw new AxiosError(`Request failed with status code ${status}`, AxiosError.ERR_BAD_REQUEST, config, {}, response);
    return response;
};
installAdapter(Axios, adapter);

beforeEach(() => {
    calls = [];
    routes = {};
});

test("new passwords follow the backend policy: 8 to 128 characters", () => {
    assert.equal(policy.PASSWORD_MIN, 8);
    assert.equal(policy.PASSWORD_MAX, 128);
    assert.equal(policy.newPasswordField.safeParse("a".repeat(7)).success, false);
    assert.equal(policy.newPasswordField.safeParse("a".repeat(8)).success, true);
    assert.equal(policy.newPasswordField.safeParse("a".repeat(129)).success, false);
});

test("sign-in accepts any non-empty password, so older short passwords still work", () => {
    assert.equal(policy.signInPasswordField.safeParse("abc").success, true);
    assert.equal(policy.signInPasswordField.safeParse("").success, false);
});

test("the new password must be confirmed exactly", () => {
    assert.equal(policy.newPasswordPairSchema.safeParse({ newPassword: "Long-enough-1", confirmPassword: "Long-enough-2" }).success, false);
    assert.equal(policy.newPasswordPairSchema.safeParse({ newPassword: "Long-enough-1", confirmPassword: "Long-enough-1" }).success, true);
});

test("forgot-password and reset-by-link post to their public endpoints", async () => {
    routes["POST /api/auth/password/forgot"] = () => [200, { status: true, message: "sent" }];
    routes["POST /api/auth/password/reset"] = () => [200, { status: true, message: "done" }];

    await store.dispatch(security.reqToForgotPassword({ data: { email: "a@b.co" } }));
    await store.dispatch(security.reqToResetPasswordWithToken({ data: { token: "t".repeat(43), new_password: "Long-enough-1" } }));

    assert.deepEqual(calls.map((c) => `${c.method} ${c.url}`), ["POST /api/auth/password/forgot", "POST /api/auth/password/reset"]);
    assert.deepEqual(calls[0].body, { email: "a@b.co" });
});

test("sessions load from the API, and a revoked one leaves the list", async () => {
    routes["GET /api/auth/sessions"] = () => [200, { status: true, data: [
        { id: "s1", device: "Chrome on Windows", ip: "1.1.1.1", createdAt: "2026-10-01", lastUsedAt: "2026-10-28", current: true },
        { id: "s2", device: "Safari on iOS", ip: null, createdAt: "2026-10-02", lastUsedAt: null, current: false },
    ] }];
    routes["DELETE /api/auth/sessions/s2"] = () => [200, { status: true, data: { id: "s2", current: false } }];

    await store.dispatch(security.reqToGetSessions({ data: null }));
    assert.deepEqual(store.getState().accountSecurity.sessions.map((s) => s.id), ["s1", "s2"]);

    await store.dispatch(security.reqToRevokeSession({ data: { id: "s2" } }));
    assert.deepEqual(store.getState().accountSecurity.sessions.map((s) => s.id), ["s1"]);
});

test("auth errors map by status/code, never by raw server text", () => {
    const err = (status, data) => ({ response: { status, data } });
    assert.match(authErrorMessage(err(429, { code: "TOO_MANY_ATTEMPTS" }), "x"), /Too many attempts/);
    assert.match(authErrorMessage({}, "x"), /Can't reach the server/);
    assert.equal(authErrorMessage(err(401, { code: "INVALID_CREDENTIALS", message: "Invalid credentials" }), "Invalid email or password."), "Invalid email or password.");
    assert.match(authErrorMessage(err(500, { message: "SQL boom" }), "x"), /Something went wrong/);
});
