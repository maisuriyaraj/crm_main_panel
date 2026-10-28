// Own file (own process): the session can only end once per page.
import "./ts-resolver.mjs";
import { test } from "node:test";
import assert from "node:assert/strict";
import { installBrowserEnv } from "./browser-env.mjs";
import { createFakeBackend, installAdapter } from "./fake-backend.mjs";

const env = installBrowserEnv();
const { Axios } = await import("../lib/axios/index.ts");
await import("../lib/auth/session.ts");

const backend = createFakeBackend();
installAdapter(Axios, backend.adapter);

test("SESSION_REVOKED ends the session at once: no refresh attempt, one logout, signin", async () => {
    backend.state.access = "revoked";

    const results = await Promise.allSettled([Axios.get("/leads"), Axios.get("/contacts")]);
    await new Promise((r) => setTimeout(r, 20));

    assert.ok(results.every((r) => r.status === "rejected"));
    assert.equal(backend.count("/api/auth/refresh"), 0, "a revoked session is never refreshed");
    assert.equal(backend.count("/api/auth/logout"), 1);
    assert.deepEqual(env.navigations, ["/auth/signin"]);
});
