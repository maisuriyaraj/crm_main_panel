import "./ts-resolver.mjs";
import { test, beforeEach } from "node:test";
import assert from "node:assert/strict";
import axios, { AxiosError } from "axios";
import { installBrowserEnv } from "./browser-env.mjs";
import { installAdapter } from "./fake-backend.mjs";

installBrowserEnv();
const { Axios } = await import("../lib/axios/index.ts");
const { store } = await import("../lib/store/index.ts");
const mappers = await import("../lib/team/mappers.ts");
const users = await import("../lib/store/slices/orgUsersSlice.ts");
const invitations = await import("../lib/store/slices/teamInvitationsSlice.ts");

// Minimal Team API: records each request and answers from `routes`.
let calls;
let routes;
const respond = (config, status, data) => {
    const response = { status, statusText: String(status), data, headers: {}, config, request: {} };
    if (status >= 400) throw new AxiosError(`Request failed with status code ${status}`, AxiosError.ERR_BAD_REQUEST, config, {}, response);
    return response;
};
const adapter = async (config) => {
    // Path with the baseURL joined, so routes are keyed the way the API sees them.
    const url = new URL(axios.getUri(config)).pathname;
    const body = typeof config.data === "string" ? JSON.parse(config.data) : config.data;
    calls.push({ method: config.method.toUpperCase(), url, params: config.params, body });
    const handler = routes[`${config.method.toUpperCase()} ${url}`];
    if (!handler) return respond(config, 404, { message: "not stubbed" });
    const [status, data] = handler(body, config.params);
    return respond(config, status, data);
};

beforeEach(() => {
    calls = [];
    routes = {};
    installAdapter(Axios, adapter);
});

const apiMember = (overrides = {}) => ({
    id: 42,
    full_name: "Priya Shah",
    email: "priya@glow.example",
    mobile: null,
    status: "active",
    role: { id: 7, name: "Employee", label: "Employee", is_admin: false },
    created_at: "2026-09-01T10:00:00Z",
    last_login_at: null,
    is_self: false,
    allowed_actions: ["change_role", "suspend", "remove"],
    ...overrides,
});

// ─── Mappers ──────────────────────────────────────────────────────────────────

test("member mapper: string ids, camelCase, 'disabled' shown as suspended, Owner label", () => {
    const member = mappers.mapMemberFromApi(
        apiMember({ status: "disabled", role: { id: 1, name: "Super Admin", is_admin: true } }),
    );
    assert.equal(member.id, "42");
    assert.equal(member.fullName, "Priya Shah");
    assert.equal(member.status, "suspended");
    assert.equal(member.role.label, "Owner", "falls back to the product label when the API omits one");
    assert.equal(member.role.id, "1");
    assert.equal(member.mobile, undefined);
    assert.deepEqual(member.allowedActions, ["change_role", "suspend", "remove"]);
});

test("summary and invitation mappers keep nulls meaningful", () => {
    assert.deepEqual(
        mappers.mapSummaryFromApi({ active: 3, suspended: 1, pending_invitations: 2, seats_used: 6, seats_limit: null }),
        { active: 3, suspended: 1, pendingInvitations: 2, seatsUsed: 6, seatsLimit: null },
    );

    const legacy = mappers.mapInvitationFromApi({
        id: 9, email: "old@glow.example", full_name: null, role: null, status: "pending",
        invited_by: null, expires_at: null, last_sent_at: "2026-01-01T00:00:00Z", send_count: 0,
        delivery_status: "link_only", source: "legacy", created_at: "2026-01-01T00:00:00Z", allowed_actions: ["resend"],
    });
    assert.equal(legacy.source, "legacy");
    assert.equal(legacy.expiresAt, null);
    assert.equal(legacy.fullName, undefined);
});

test("audit events read as sentences, with Owner for Super Admin and a fallback for removed people", () => {
    const describe = (action, extra = {}) =>
        mappers.describeAuditEvent({
            id: "1", action, actor: { id: "1", fullName: "Raj" }, targetType: "user",
            target: { id: "2", label: "Priya" }, metadata: {}, createdAt: "2026-10-01T00:00:00Z", ...extra,
        });

    assert.equal(
        describe("team.member.role_changed", { metadata: { from_role: "Employee", to_role: "Super Admin" } }),
        "Raj changed Priya's role from Employee to Owner",
    );
    assert.equal(
        describe("team.invitation.created", { targetType: "invitation", target: { id: "5", label: "a@b.co" }, metadata: { email: "a@b.co", role: "Manager" } }),
        "Raj invited a@b.co as Manager",
    );
    assert.equal(describe("team.member.suspended", { target: { id: "2", label: null } }), "Raj suspended a former member");
    assert.equal(describe("team.invitation.revoked", { actor: null, metadata: { email: "x@y.z" } }), "The invitation for x@y.z was revoked");
});

test("field errors map API names onto form fields and drop unknown ones", () => {
    const mapped = mappers.mapTeamFieldErrors(
        [{ field: "email", message: "bad" }, { field: "role_id", message: "required" }, { field: null, message: "x" }, { field: "other", message: "y" }],
        { email: "email", role_id: "roleId" },
    );
    assert.deepEqual(mapped, [{ field: "email", message: "bad" }, { field: "roleId", message: "required" }]);
});

// ─── Slices ───────────────────────────────────────────────────────────────────

test("member list: sends server-side filters and stores mapped rows, pagination and summary", async () => {
    routes["GET /api/app/users"] = () => [200, {
        status: true,
        data: [apiMember()],
        pagination: { total: 1, page: 1, limit: 20, totalPages: 1 },
        summary: { active: 1, suspended: 0, pending_invitations: 2, seats_used: 3, seats_limit: 5 },
    }];

    await store.dispatch(users.reqToGetOrgUsers({ data: { page: 1, limit: 20, status: "suspended", search: "pri" } }));

    assert.deepEqual(calls[0].params, { page: 1, limit: 20, status: "suspended", search: "pri" });
    const state = store.getState().orgUsers;
    assert.equal(state.users[0].email, "priya@glow.example");
    assert.equal(state.pagination.total, 1);
    assert.equal(state.summary.seatsLimit, 5);
    assert.equal(state.error, null);
});

test("a refused member action does not mark the list as failed to load", async () => {
    routes["POST /api/app/users/42/suspend"] = () => [409, { status: false, code: "LAST_OWNER", message: "only owner" }];

    let failure;
    await store.dispatch(users.reqToSuspendOrgUser({ data: { id: "42" }, onFailure: (error) => { failure = error; } }));

    assert.equal(mappers.toTeamApiError(failure, "x").code, "LAST_OWNER");
    assert.equal(store.getState().orgUsers.error, null);
    assert.equal(store.getState().orgUsers.isMutating, false);
});

test("remove sends the optional reassignment in the DELETE body", async () => {
    routes["DELETE /api/app/users/42"] = () => [200, { status: true, data: { id: 42 } }];

    await store.dispatch(users.reqToDeleteOrgUser({ data: { id: "42", reassignToUserId: "7" } }));
    assert.deepEqual(calls.at(-1).body, { reassign_to_user_id: "7" });

    await store.dispatch(users.reqToDeleteOrgUser({ data: { id: "42" } }));
    assert.deepEqual(calls.at(-1).body, {});
});

test("member options (names only) feed the Leads/Contacts owner dropdowns", async () => {
    routes["GET /api/app/members/options"] = () => [200, { status: true, data: [{ id: 3, full_name: "Raj" }] }];

    await store.dispatch(users.reqToGetMemberOptions({ data: null }));
    assert.deepEqual(store.getState().orgUsers.memberOptions, [{ id: "3", fullName: "Raj" }]);
});

test("create invitation posts snake_case and hands the one-time link to onSuccess", async () => {
    routes["POST /api/app/invitations"] = (body) => [201, {
        status: true,
        data: {
            invitation: {
                id: 5, email: body.email, full_name: body.full_name ?? null, role: { id: 7, name: "Employee", label: "Employee" },
                status: "pending", invited_by: { id: 1, full_name: "Raj" }, expires_at: "2026-10-19T00:00:00Z",
                last_sent_at: "2026-10-12T00:00:00Z", send_count: 1, delivery_status: "link_only", source: "invitation",
                created_at: "2026-10-12T00:00:00Z", allowed_actions: ["resend", "revoke"],
            },
            delivery: "link_only",
            invite_url: "http://localhost:3002/auth/accept-invite#token=abc",
        },
    }];

    let result;
    await store.dispatch(invitations.reqToCreateInvitation({
        data: { email: "new@glow.example", fullName: "", roleId: "7" },
        onSuccess: (r) => { result = r; },
    }));

    assert.deepEqual(calls[0].body, { email: "new@glow.example", role_id: "7" }, "empty name is not sent");
    assert.equal(result.delivery, "link_only");
    assert.match(result.inviteUrl, /#token=abc$/);
    assert.equal(result.invitation.invitedBy.fullName, "Raj");
});

test("legacy rows resend through their own endpoint", async () => {
    routes["POST /api/app/invitations/legacy/12/resend"] = () => [200, {
        status: true,
        data: {
            invitation: { id: 6, email: "old@glow.example", role: null, status: "pending", last_sent_at: "x", send_count: 1, delivery_status: "link_only", source: "invitation", created_at: "x", allowed_actions: [] },
            delivery: "link_only",
            invite_url: "http://x/auth/accept-invite#token=t",
        },
    }];

    await store.dispatch(invitations.reqToResendLegacyInvitation({ data: { userId: "12" } }));
    assert.equal(calls[0].url, "/api/app/invitations/legacy/12/resend");
});
