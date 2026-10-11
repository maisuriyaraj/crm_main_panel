// Own file (own process): the session can only end once per page.
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

test("both tokens expired: cleanup first, then the notice waits for acknowledgement before redirecting", async () => {
    const notices = [];
    session.registerExpiredNotice((acknowledge) => notices.push(acknowledge));

    env.localStorage.setItem("user", JSON.stringify({ id: 9 }));
    store.dispatch({ type: "auth/reqToFetchMe/fulfilled", payload: { data: { id: 9, organizationId: 9 } } });

    backend.state.access = "expired";
    backend.state.refresh = "401";
    await Promise.allSettled([Axios.get("/api/leads"), Axios.get("/api/contacts")]);
    await new Promise((r) => setTimeout(r, 50));

    assert.equal(notices.length, 1, "notice shown once despite concurrent failures");
    assert.deepEqual(env.navigations, [], "no redirect until acknowledged");
    // Everything is already cleaned up while the notice is open.
    assert.equal(backend.count("/api/auth/logout"), 1);
    assert.equal(store.getState().auth.user, null);
    assert.equal(env.localStorage.getItem("user"), null);

    notices[0]();
    assert.deepEqual(env.navigations, ["/auth/signin"]);

    await session.endSession();
    assert.equal(notices.length, 1, "repeat calls don't reopen the notice");
});
