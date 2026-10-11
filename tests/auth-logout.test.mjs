// Own file (own process): the session can only end once per page.
import "./ts-resolver.mjs";
import { test } from "node:test";
import assert from "node:assert/strict";
import { installBrowserEnv } from "./browser-env.mjs";
import { createFakeBackend, installAdapter } from "./fake-backend.mjs";

const env = installBrowserEnv();
const { Axios } = await import("../lib/axios/index.ts");
const session = await import("../lib/auth/session.ts");

const backend = createFakeBackend();
installAdapter(Axios, backend.adapter);

test("explicit logout: full cleanup, no expiry notice, straight to /", async () => {
    const notices = [];
    session.registerExpiredNotice((acknowledge) => notices.push(acknowledge));
    env.localStorage.setItem("user", JSON.stringify({ id: 9 }));

    await session.endSession("logout");

    assert.equal(backend.count("/api/auth/logout"), 1);
    assert.equal(env.localStorage.getItem("user"), null);
    assert.equal(notices.length, 0);
    assert.deepEqual(env.navigations, ["/"]);
});
