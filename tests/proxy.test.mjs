import "./ts-resolver.mjs";
import { test } from "node:test";
import assert from "node:assert/strict";
import { NextRequest } from "next/server.js";

const { proxy } = await import("../proxy.ts");

const run = (path, cookies = {}) => {
    const req = new NextRequest(new URL(path, "http://localhost:3002"), {
        headers: { cookie: Object.entries(cookies).map(([k, v]) => `${k}=${v}`).join("; ") },
    });
    return proxy(req).headers.get("location");
};

const userCookie = encodeURIComponent(JSON.stringify({ organizationId: 9 }));

test("unauthenticated protected route -> signin with redirect param", () => {
    assert.equal(run("/9/dashboard"), "http://localhost:3002/auth/signin?redirect=%2F9%2Fdashboard");
});

test("expired access cookie but live session hint -> page loads so the client can refresh", () => {
    assert.equal(run("/9/dashboard", { authSession: "1" }), null);
});

test("authenticated user opening signin/signup -> their dashboard", () => {
    assert.equal(run("/auth/signin", { token: "t", user: userCookie }), "http://localhost:3002/9/dashboard");
    assert.equal(run("/auth/signup", { authSession: "1", user: userCookie }), "http://localhost:3002/9/dashboard");
});

test("home never redirects, even with stale auth cookies (logout landing page)", () => {
    assert.equal(run("/", { token: "stale", authSession: "1", user: userCookie }), null);
});

test("signin with session hint but no user cookie renders signin (no bounce)", () => {
    assert.equal(run("/auth/signin", { authSession: "1" }), null);
});

test("after logout (no cookies) protected pages stay gated", () => {
    assert.ok(run("/9/leads").startsWith("http://localhost:3002/auth/signin"));
});

test("unauthenticated public pages stay accessible", () => {
    assert.equal(run("/"), null);
    assert.equal(run("/auth/signin"), null);
    assert.equal(run("/auth/signup"), null);
});
