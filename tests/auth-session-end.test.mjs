// Separate file (so a separate process): ending the session is one-way for
// the lifetime of the page, exactly as in the browser.
import "./ts-resolver.mjs";
import { test } from "node:test";
import assert from "node:assert/strict";
import { installBrowserEnv } from "./browser-env.mjs";
import { createFakeBackend, installAdapter } from "./fake-backend.mjs";

const env = installBrowserEnv();
const { Axios } = await import("../lib/axios/index.ts");
const session = await import("../lib/auth/session.ts");
const { store } = await import("../lib/store/index.ts");

const backend = createFakeBackend();
installAdapter(Axios, backend.adapter);

test("expired/revoked refresh token: single cleanup, single redirect to signin, no loop", async () => {
    env.localStorage.setItem("theme", "dark");
    env.localStorage.setItem("user", JSON.stringify({ id: 9 }));
    env.localStorage.setItem("accessToken", "legacy");
    env.sessionStorage.setItem("draft", "x");
    store.dispatch({ type: "auth/reqToFetchMe/fulfilled", payload: { data: { id: 9, organizationId: 9 } } });
    assert.equal(store.getState().auth.user.id, 9);

    backend.state.access = "expired";
    backend.state.refresh = "401";

    const results = await Promise.allSettled([
        Axios.get("/api/leads"),
        Axios.get("/api/contacts"),
        Axios.get("/api/auth/me"),
    ]);
    assert.ok(results.every((r) => r.status === "rejected"));
    // endSession awaits the logout call; let it settle.
    await new Promise((r) => setTimeout(r, 50));

    assert.equal(backend.count("/api/auth/refresh"), 1, "only one refresh attempt");
    assert.equal(backend.count("/api/auth/logout"), 1, "logout called once");
    assert.deepEqual(env.navigations, ["/auth/signin"], "no notice mounted: straight to signin");
    assert.equal(session.isSessionEnded(), true);

    // Redux wiped; the guard sees a checked, signed-out state (no re-fetch).
    assert.equal(store.getState().auth.user, null);
    assert.equal(store.getState().auth.isAuthChecked, true);

    // App storage cleared, device preference kept, `user` cookie expired.
    assert.equal(env.localStorage.getItem("user"), null);
    assert.equal(env.localStorage.getItem("accessToken"), null);
    assert.equal(env.localStorage.getItem("theme"), "dark");
    assert.equal(env.sessionStorage.getItem("draft"), null);
    assert.ok(env.cookieWrites.some((c) => c.startsWith("user=;") && c.includes("1970")));
});

test("after the session ended, further requests are cancelled and nothing re-triggers", async () => {
    const before = backend.state.calls.length;
    await assert.rejects(Axios.get("/api/leads"), (e) => e.name === "CanceledError");
    await session.endSession(); // repeated logout is a no-op
    assert.equal(backend.state.calls.length, before);
    assert.deepEqual(env.navigations, ["/auth/signin"]);
});
