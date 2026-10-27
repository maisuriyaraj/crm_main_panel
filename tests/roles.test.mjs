// Custom roles in the User Panel: the permission matrix rules, the form schema
// (which mirrors the API's), the mappers, and the requests the roles slices
// send. Same harness as team.test.mjs: real store and slices, fake Axios adapter.
import "./ts-resolver.mjs";
import { test, beforeEach } from "node:test";
import assert from "node:assert/strict";
import { AxiosError } from "axios";
import { installBrowserEnv } from "./browser-env.mjs";
import { installAdapter } from "./fake-backend.mjs";

installBrowserEnv();
const { Axios } = await import("../lib/axios/index.ts");
const { store } = await import("../lib/store/index.ts");
const matrix = await import("../lib/roles/matrix.ts");
const { roleFormSchema, normalizeRoleName } = await import("../lib/roles/schema.ts");
const mappers = await import("../lib/team/mappers.ts");
const roles = await import("../lib/store/slices/teamRolesSlice.ts");
const catalogSlice = await import("../lib/store/slices/permissionCatalogSlice.ts");

let calls;
let routes;
const respond = (config, status, data) => {
    const response = { status, statusText: String(status), data, headers: {}, config, request: {} };
    if (status >= 400) throw new AxiosError(`Request failed with status code ${status}`, AxiosError.ERR_BAD_REQUEST, config, {}, response);
    return response;
};
beforeEach(() => {
    calls = [];
    routes = {};
    installAdapter(Axios, async (config) => {
        const url = config.url.replace(/^https?:\/\/[^/]+/, "");
        const body = typeof config.data === "string" ? JSON.parse(config.data) : config.data;
        calls.push({ method: config.method.toUpperCase(), url, params: config.params, body });
        const handler = routes[`${config.method.toUpperCase()} ${url}`];
        if (!handler) return respond(config, 404, { message: "not stubbed" });
        const [status, data] = handler(body, config.params);
        return respond(config, status, data);
    });
});

const apiCatalog = {
    modules: [
        { module: "leads", label: "Leads", status: "live", permissions: [
            { key: "leads.view", label: "View leads", description: "", requires: [], reserved: false },
            { key: "leads.update", label: "Edit leads", description: "", requires: ["leads.view"], reserved: false },
            { key: "leads.delete", label: "Delete leads", description: "", requires: ["leads.view"], reserved: false },
        ] },
        { module: "team", label: "Team", status: "live", permissions: [
            { key: "team.view", label: "View team", description: "", requires: [], reserved: false },
            { key: "team.manage", label: "Manage members", description: "", requires: ["team.view"], reserved: true },
        ] },
        { module: "deals", label: "Deals", status: "planned", permissions: [
            { key: "deals.view", label: "View deals", description: "", requires: [], reserved: false },
        ] },
    ],
};
const modules = mappers.mapPermissionCatalogFromApi(apiCatalog);
const index = matrix.indexCatalog(modules);
const leads = modules[0];
const team = modules[1];

// ─── Matrix rules ─────────────────────────────────────────────────────────────

test("ticking an action also ticks the View it needs, and says so", () => {
    const { next, alsoAdded } = matrix.toggleKey(new Set(), "leads.delete", true, index);
    assert.deepEqual([...next].sort(), ["leads.delete", "leads.view"]);
    assert.deepEqual(alsoAdded, ["View leads"]);
});

test("unticking View clears everything that needs it", () => {
    const { next, alsoRemoved } = matrix.toggleKey(new Set(["leads.view", "leads.update", "leads.delete"]), "leads.view", false, index);
    assert.equal(next.size, 0);
    assert.deepEqual(alsoRemoved.sort(), ["Delete leads", "Edit leads"]);
});

test("reserved permissions can never be selected, by key or by select-all", () => {
    assert.equal(matrix.toggleKey(new Set(), "team.manage", true, index).next.size, 0);
    const all = matrix.toggleModule(team, new Set(), index);
    assert.deepEqual([...all], ["team.view"]);
    assert.deepEqual(matrix.toPermissionList(new Set(["team.manage", "team.view", "bogus.key"]), index), ["team.view"]);
});

test("module select-all is tri-state and toggles between full and empty", () => {
    assert.equal(matrix.moduleSelection(leads, new Set()).state, false);
    assert.equal(matrix.moduleSelection(leads, new Set(["leads.view"])).state, "indeterminate");
    const full = matrix.toggleModule(leads, new Set(["leads.view"]), index);
    assert.equal(matrix.moduleSelection(leads, full).state, true);
    assert.equal(matrix.toggleModule(leads, full, index).size, 0);
    assert.deepEqual(matrix.moduleSelection(team, new Set()), { selectable: 1, selected: 0, state: false }, "reserved keys are not counted");
});

// ─── Form schema mirrors the API ──────────────────────────────────────────────

test("role name rules match the API: trimmed, 2-50 characters, built-in names reserved in any case", () => {
    const error = (name) => roleFormSchema.safeParse({ name, description: "" }).error?.issues[0]?.message;
    assert.equal(normalizeRoleName("  Field   Sales "), "Field Sales");
    assert.equal(error("Field Sales"), undefined);
    assert.equal(error("   "), "Role name is required");
    assert.equal(error("X"), "Name must be at least 2 characters");
    assert.equal(error("x".repeat(51)), "Name must be at most 50 characters");
    for (const reserved of ["Admin", " owner ", "SUPER   ADMIN", "manager", "Employee"]) {
        assert.equal(error(reserved), "This name is reserved for a built-in role", reserved);
    }
});

// ─── Mappers ──────────────────────────────────────────────────────────────────

test("role list rows map the server-computed flags and counts", () => {
    const role = mappers.mapRoleFromApi({
        id: 31, name: "Sales Rep", label: "Sales Rep", is_admin: false, is_system: false, system_key: null, rank: 10,
        assignable: true, editable: true, deletable: false, member_count: 3, pending_invitation_count: 1,
        permission_count: 2, version: 4, permissions: ["leads.view", "leads.update"],
    });
    assert.equal(role.id, "31");
    assert.deepEqual(
        { isSystem: role.isSystem, editable: role.editable, deletable: role.deletable, memberCount: role.memberCount, version: role.version },
        { isSystem: false, editable: true, deletable: false, memberCount: 3, version: 4 }
    );
    assert.deepEqual(role.permissions, ["leads.view", "leads.update"]);
    assert.equal(modules[2].status, "planned");
});

test("Activity tab describes role events, including deleted roles", () => {
    const event = (action, metadata, label = "Sales Rep") => mappers.describeAuditEvent({
        id: "1", action, actor: { id: "5", fullName: "Priya" }, targetType: "role",
        target: { id: "31", label }, metadata, createdAt: "",
    });
    assert.equal(event("team.role.created", {}), "Priya created the role Sales Rep");
    assert.equal(
        event("team.role.updated", { permissions: { added: ["a"], removed: ["b", "c"] }, version: { from: 4, to: 5 } }),
        "Priya changed the role Sales Rep (added 1 permission, removed 2 permissions)"
    );
    assert.equal(event("team.role.deleted", { name: "Old Role" }, null), "Priya deleted the role Old Role");
    assert.equal(event("team.authz.denied", { attempted: "create_role" }), "Priya was blocked from creating a role");
});

// ─── Requests ─────────────────────────────────────────────────────────────────

test("role list asks for permissions; catalog loads into its own slice", async () => {
    routes["GET /app/roles"] = () => [200, { data: [] }];
    routes["GET /app/permissions"] = () => [200, { data: apiCatalog }];
    await store.dispatch(roles.reqToGetTeamRoles({ data: null }));
    await store.dispatch(catalogSlice.reqToGetPermissionCatalog({ data: null }));

    assert.deepEqual(calls[0].params, { include: "permissions" });
    assert.equal(store.getState().permissionCatalog.modules.length, 3);
});

test("create sends only name, description and permissions; never an organization", async () => {
    let created;
    routes["POST /app/roles"] = (body) => [201, { data: { id: 36, ...body, version: 1, is_system: false } }];
    await store.dispatch(roles.reqToCreateTeamRole({
        data: { name: "Field Sales", description: null, permissions: ["leads.view"] },
        onSuccess: (role) => { created = role; },
    }));

    assert.deepEqual(calls[0].body, { name: "Field Sales", description: null, permissions: ["leads.view"] });
    assert.equal(created.id, "36");
});

test("update sends the loaded version; a conflict reaches onFailure and leaves the list loaded", async () => {
    routes["PATCH /app/roles/31"] = () => [409, { status: false, code: "VERSION_CONFLICT", message: "This role was changed by someone else", data: { current_version: 5 } }];
    let failure;
    const result = await store.dispatch(roles.reqToUpdateTeamRole({
        data: { id: "31", version: 4, permissions: ["leads.view"] },
        onFailure: (error) => { failure = error; },
    }));

    assert.deepEqual(calls[0].body, { version: 4, permissions: ["leads.view"] });
    assert.equal(result.payload.code, "VERSION_CONFLICT");
    assert.equal(result.payload.data.current_version, 5);
    assert.ok(failure);
    assert.equal(store.getState().teamRoles.error, null, "the list is not marked as failed");
    assert.equal(store.getState().teamRoles.isSaving, false);
});

test("delete in use returns the counts for the blocked dialog; a successful delete drops the row", async () => {
    routes["GET /app/roles"] = () => [200, { data: [{ id: 31, name: "Sales Rep" }, { id: 35, name: "Support" }] }];
    await store.dispatch(roles.reqToGetTeamRoles({ data: null }));

    routes["DELETE /app/roles/31"] = () => [409, { status: false, code: "ROLE_IN_USE", message: "In use", data: { members: 2, pending_invitations: 1 } }];
    const blocked = await store.dispatch(roles.reqToDeleteTeamRole({ data: { id: "31" } }));
    assert.deepEqual(blocked.payload.data, { members: 2, pending_invitations: 1 });

    routes["DELETE /app/roles/35"] = () => [200, { data: { id: 35 } }];
    await store.dispatch(roles.reqToDeleteTeamRole({ data: { id: "35" } }));
    assert.deepEqual(store.getState().teamRoles.roles.map((r) => r.id), ["31"]);
});
