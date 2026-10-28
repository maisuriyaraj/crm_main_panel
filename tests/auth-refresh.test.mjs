import "./ts-resolver.mjs";
import { test, beforeEach } from "node:test";
import assert from "node:assert/strict";
import { installBrowserEnv } from "./browser-env.mjs";
import { createFakeBackend, installAdapter } from "./fake-backend.mjs";

const env = installBrowserEnv();
const { Axios } = await import("../lib/axios/index.ts");
const session = await import("../lib/auth/session.ts");

let backend;
beforeEach(() => {
    backend = createFakeBackend();
    installAdapter(Axios, backend.adapter);
});

test("valid access token: request succeeds without a refresh", async () => {
    const res = await Axios.get("/leads");
    assert.equal(res.status, 200);
    assert.equal(backend.count("/api/auth/refresh"), 0);
});

test("expired access token: one refresh, original request retried once", async () => {
    backend.state.access = "expired";
    const res = await Axios.get("/leads");
    assert.equal(res.status, 200);
    assert.equal(backend.count("/api/auth/refresh"), 1);
    assert.equal(backend.count("/api/leads"), 2);
});

test("concurrent expired requests share a single refresh", async () => {
    backend.state.access = "expired";
    const results = await Promise.all([
        Axios.get("/leads"),
        Axios.get("/contacts"),
        Axios.get("/auth/me"),
        Axios.get("/app/users"),
    ]);
    assert.ok(results.every((r) => r.status === 200));
    assert.equal(backend.count("/api/auth/refresh"), 1);
});

test("TOKEN_INVALID 401 is not refreshed", async () => {
    backend.state.access = "invalid";
    await assert.rejects(Axios.get("/leads"), (e) => e.response.status === 401);
    assert.equal(backend.count("/api/auth/refresh"), 0);
});

test("403 (insufficient permission) never triggers a refresh", async () => {
    backend.state.access = "forbidden";
    await assert.rejects(Axios.get("/app/users"), (e) => e.response.status === 403);
    assert.equal(backend.count("/api/auth/refresh"), 0);
});

test("replayed request that 401s again does not refresh again (no loop)", async () => {
    backend.state.access = "expired";
    backend.state.retryStays401 = true;
    await assert.rejects(Axios.get("/leads"), (e) => e.response.status === 401);
    assert.equal(backend.count("/api/auth/refresh"), 1);
    assert.equal(backend.count("/api/leads"), 2);
});

test("refresh endpoint unreachable (network): no logout, no retry storm", async () => {
    backend.state.access = "expired";
    backend.state.refresh = "network";
    const results = await Promise.allSettled([Axios.get("/leads"), Axios.get("/contacts")]);
    assert.ok(results.every((r) => r.status === "rejected"));
    assert.equal(backend.count("/api/auth/refresh"), 1);
    assert.equal(backend.count("/api/auth/logout"), 0);
    assert.equal(session.isSessionEnded(), false);
    assert.deepEqual(env.navigations, []);
});

test("refresh endpoint 5xx: no logout", async () => {
    backend.state.access = "expired";
    backend.state.refresh = "500";
    await assert.rejects(Axios.get("/leads"));
    assert.equal(backend.count("/api/auth/logout"), 0);
    assert.equal(session.isSessionEnded(), false);
});

test("a 401 from the refresh call itself is never refreshed recursively", async () => {
    backend.state.refresh = "401";
    await assert.rejects(Axios.post("/auth/refresh"), (e) => e.response.status === 401);
    assert.equal(backend.count("/api/auth/refresh"), 1);
});
