// Own file (own process): ending the session tells the other tabs, and an
// expiry sends the user back to the page they were on after signing in.
import "./ts-resolver.mjs";
import { test } from "node:test";
import assert from "node:assert/strict";
import { installBrowserEnv } from "./browser-env.mjs";
import { createFakeBackend, installAdapter } from "./fake-backend.mjs";

const env = installBrowserEnv();
window.location.pathname = "/9/leads";
window.location.search = "?stage=won";
const { Axios } = await import("../lib/axios/index.ts");
const session = await import("../lib/auth/session.ts");

const backend = createFakeBackend();
installAdapter(Axios, backend.adapter);

test("an expired session broadcasts to other tabs and returns to the same page after sign-in", async () => {
    const otherTab = new BroadcastChannel("orbitops-auth");
    const received = [];
    otherTab.onmessage = (event) => received.push(event.data);

    await session.endSession("expired");
    await new Promise((r) => setTimeout(r, 50));
    otherTab.close();

    assert.deepEqual(received, [{ type: "session-ended", reason: "expired" }]);
    assert.equal(backend.count("/api/auth/logout"), 1);
    assert.deepEqual(env.navigations, [`/auth/signin?redirect=${encodeURIComponent("/9/leads?stage=won")}`]);
});
