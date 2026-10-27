// Permission-aware UI: which sidebar entries each role sees, and the 403
// hook that makes the panel re-read /me. Cosmetic only; the API enforces.
import "./ts-resolver.mjs";
import { test, beforeEach } from "node:test";
import assert from "node:assert/strict";
import { AxiosError } from "axios";
import { installBrowserEnv } from "./browser-env.mjs";
import { installAdapter } from "./fake-backend.mjs";

installBrowserEnv();
const { Axios, setForbiddenListener } = await import("../lib/axios/index.ts");
const { apiRoutes } = await import("../lib/constants.ts");
const { navGroups, visibleNavGroups } = await import("../lib/navigation.ts");

// Copies of the backend's system grants (crm_backend/src/utils/permissions.js)
// for the keys the sidebar reads. If a system role's menu changes here, the
// golden snapshot below must change on purpose.
const EMPLOYEE = [
    "dashboard.view", "leads.view", "contacts.view", "companies.view", "deals.view", "tasks.view",
    "ads.view", "growth.view", "members.lookup",
];
const MANAGER = [...EMPLOYEE, "team.view"];

const menuFor = (permissions) =>
    visibleNavGroups(navGroups, (key) => permissions.includes(key)).map(
        (group) => `${group.label}: ${group.items.map((item) => item.label).join(", ")}`
    );

const FULL_MENU = [
    "Workspace: Dashboard, Leads, Contacts, Companies, Deals, Tasks",
    "Growth: Ads Manager, Growth",
    "Organization: Team",
];

test("system roles see the same menu as before custom roles", () => {
    assert.deepEqual(menuFor(MANAGER), FULL_MENU);
    assert.deepEqual(menuFor(EMPLOYEE), FULL_MENU.slice(0, 2), "Employee has no team.view");
});

test("a custom role sees only the modules it can view, and empty groups disappear", () => {
    assert.deepEqual(menuFor(["leads.view", "leads.update"]), ["Workspace: Leads"]);
    assert.deepEqual(menuFor(["contacts.view", "team.view"]), ["Workspace: Contacts", "Organization: Team"]);
    assert.deepEqual(menuFor([]), []);
});

test("every sidebar entry names a .view permission", () => {
    for (const group of navGroups) {
        for (const item of group.items) assert.match(item.permission, /^[a-z]+\.view$/, item.label);
    }
});

// ─── 403 → re-read /me ────────────────────────────────────────────────────────

let forbidden;
beforeEach(() => {
    forbidden = 0;
    setForbiddenListener(() => {
        forbidden += 1;
    });
});

const answer = (status, code) =>
    installAdapter(Axios, async (config) => {
        const response = { status, statusText: String(status), data: { code }, headers: {}, config, request: {} };
        throw new AxiosError(`Request failed with status code ${status}`, AxiosError.ERR_BAD_REQUEST, config, {}, response);
    });

test("any module's 403 FORBIDDEN notifies the listener; the request still fails", async () => {
    answer(403, "FORBIDDEN");
    await assert.rejects(Axios.delete("/leads/7"));
    await assert.rejects(Axios.get("/contacts"));
    assert.equal(forbidden, 2);
});

test("other 403s, and a 403 from /me itself, don't trigger a refresh", async () => {
    answer(403, "MEMBERSHIP_INACTIVE");
    await assert.rejects(Axios.get("/leads"));
    answer(403, "FORBIDDEN");
    await assert.rejects(Axios.get(apiRoutes.me));
    answer(400, "FORBIDDEN");
    await assert.rejects(Axios.get("/leads"));
    assert.equal(forbidden, 0);
});
