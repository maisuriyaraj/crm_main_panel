// Own file (own process): this page plays the tab that is told by another
// tab (a second BroadcastChannel on the same name) that the user signed out.
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

test("a logout in another tab signs this tab out too, without a second API logout", async () => {
    env.localStorage.setItem("user", JSON.stringify({ id: 9 }));
    store.dispatch({ type: "auth/reqToFetchMe/fulfilled", payload: { data: { id: 9, organizationId: 9 } } });

    const otherTab = new BroadcastChannel("orbitops-auth");
    otherTab.postMessage({ type: "session-ended", reason: "logout" });
    await new Promise((r) => setTimeout(r, 50));
    otherTab.close();

    assert.equal(session.isSessionEnded(), true);
    assert.equal(store.getState().auth.user, null, "protected data wiped from memory");
    assert.equal(env.localStorage.getItem("user"), null);
    assert.equal(backend.count("/api/auth/logout"), 0, "the tab that logged out already told the API");
    assert.deepEqual(env.navigations, ["/"]);
});

test("messages that are not ours are ignored", async () => {
    // The session is already over here; this only proves junk doesn't throw.
    const stranger = new BroadcastChannel("orbitops-auth");
    stranger.postMessage({ type: "hello" });
    stranger.postMessage("nonsense");
    await new Promise((r) => setTimeout(r, 20));
    stranger.close();
    assert.deepEqual(env.navigations, ["/"]);
});
