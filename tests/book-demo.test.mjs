import "./ts-resolver.mjs";
import { test, beforeEach } from "node:test";
import assert from "node:assert/strict";
import { AxiosError } from "axios";
import { installBrowserEnv } from "./browser-env.mjs";
import { installAdapter } from "./fake-backend.mjs";

installBrowserEnv();
const { Axios } = await import("../lib/axios/index.ts");
const { store } = await import("../lib/store/index.ts");
const slice = await import("../lib/store/slices/publicAPisSlice.ts");
const form = await import("../lib/bookings/bookDemo.ts");

// Minimal public bookings API: records each request and answers from `routes`.
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

const SLOT = "2026-11-04T05:30:00.000Z";
const filled = (overrides = {}) => ({
    ...form.initialBookDemoValues,
    fullName: "  Asha Rao ",
    businessEmail: " Asha@Acme.IN ",
    businessName: "Acme Traders",
    teamSize: "11-50",
    preferredDate: "2026-11-04",
    preferredSlot: SLOT,
    ...overrides,
});

// ─── The request the form sends ──────────────────────────────────────────────

test("the request carries the exact offered slot and the visitor's timezone, with no blank fields", () => {
    const request = form.buildBookingRequest(filled(), "America/New_York");
    assert.deepEqual(request, {
        full_name: "Asha Rao",
        email: "asha@acme.in",
        organization_name: "Acme Traders",
        team_members_count: "11-50",
        scheduled_at: SLOT,
        timezone: "America/New_York",
        meeting_type: "virtual",
    });
    for (const key of Object.keys(request)) assert.notEqual(request[key], "", `${key} is never sent blank`);
    assert.ok(!("invite_emails" in request) && !("status" in request), "no hard-coded or internal fields");
});

test("optional fields are sent only when filled; the honeypot only if a bot filled it", () => {
    const request = form.buildBookingRequest(filled({ phoneNumber: " +91 98765 43210 ", message: " Pipeline please ", meetingType: "onsite", website: "x" }), "Asia/Kolkata");
    assert.equal(request.mobile, "+91 98765 43210");
    assert.equal(request.business_requirements, "Pipeline please");
    assert.equal(request.meeting_type, "onsite");
    assert.equal(request.website, "x");
});

// ─── Form rules mirror the API ───────────────────────────────────────────────

const errorsFor = async (values, slots = [SLOT]) => {
    try {
        await form.bookDemoSchema(slots).validate(values, { abortEarly: false });
        return {};
    } catch (error) {
        return Object.fromEntries(error.inner.map((e) => [e.path, e.message]));
    }
};

test("a complete form is valid", async () => {
    assert.deepEqual(await errorsFor(filled()), {});
});

test("the same limits as the API: lengths, email, phone, team size, message", async () => {
    const errors = await errorsFor(filled({
        fullName: "A",
        businessEmail: "nope",
        businessName: "x".repeat(121),
        teamSize: "5000",
        phoneNumber: "call me",
        message: "x".repeat(2001),
    }));
    assert.deepEqual(Object.keys(errors).sort(), ["businessEmail", "businessName", "fullName", "message", "phoneNumber", "teamSize"]);
});

test("a date and an offered time are required; a time that is no longer offered is refused", async () => {
    const missing = await errorsFor(filled({ preferredDate: "", preferredSlot: "" }));
    assert.ok(missing.preferredDate && missing.preferredSlot);
    const stale = await errorsFor(filled({ preferredSlot: "2026-11-04T06:00:00.000Z" }));
    assert.equal(stale.preferredSlot, "Choose one of the available times");
});

// ─── Server errors map back onto the form ────────────────────────────────────

test("server field errors land on the matching form fields", () => {
    const outcome = form.interpretBookingError({
        status: 400, code: "VALIDATION_FAILED", message: "Validation failed",
        errors: [{ field: "email", message: "Invalid email" }, { field: "team_members_count", message: "Please select your team size" }],
    });
    assert.deepEqual(outcome, { kind: "fields", fieldErrors: { businessEmail: "Invalid email", teamSize: "Please select your team size" } });
});

test("a refused slot, a duplicate, and a rate limit are told apart", () => {
    assert.deepEqual(form.interpretBookingError({ status: 422, code: "SLOT_NOT_ALLOWED", message: "Too soon", errors: [{ field: "scheduled_at", message: "Too soon" }] }),
        { kind: "slot", fieldErrors: { preferredSlot: "Too soon" } });
    assert.equal(form.interpretBookingError({ status: 409, code: "DUPLICATE_OPEN_BOOKING", message: "Already booked" }).kind, "duplicate");
    assert.equal(form.interpretBookingError({ status: 429, message: "Rate limit exceeded" }).kind, "rate_limited");
    assert.equal(form.interpretBookingError({ status: 500, message: "Something went wrong." }).kind, "other");
});

test("only the duplicate code means 'we already have your request'; any other 409 is a plain error", () => {
    const outcome = form.interpretBookingError({ status: 409, code: "SOMETHING_ELSE", message: "Conflict" });
    assert.deepEqual(outcome, { kind: "other", message: "Conflict" });
});

test("names with line breaks are refused, as the server does", async () => {
    const errors = await errorsFor(filled({ fullName: "Asha\nBcc: x@evil.io", businessName: "Acme\tTraders" }));
    assert.equal(errors.fullName, "Full name contains invalid characters");
    assert.equal(errors.businessName, "Business name contains invalid characters");
});

// ─── Labels never shift a day ────────────────────────────────────────────────

test("day labels show the visitor's own date, whatever the browser's timezone", () => {
    assert.match(form.formatDayLabel("2026-11-04"), /4/);
    assert.equal(form.addDays("2026-03-28", 1), "2026-03-29");
    assert.equal(form.addDays("2026-10-31", 2), "2026-11-02");
    assert.equal(form.todayInZone("Asia/Kolkata", new Date("2026-11-03T20:00:00Z")), "2026-11-04");
    assert.equal(form.todayInZone("America/New_York", new Date("2026-11-04T03:00:00Z")), "2026-11-03");
});

test("slot times are shown in the visitor's zone", () => {
    assert.match(form.formatSlotTime(SLOT, "Asia/Kolkata"), /11:00/);
    assert.match(form.formatSlotTime(SLOT, "Europe/London"), /5:30|05:30/);
});

// ─── Thunks ──────────────────────────────────────────────────────────────────

test("booking posts to the public v2 endpoint and returns the acknowledgement", async () => {
    const ack = { reference: "DMO-7K3M9Q2X", scheduled_at: SLOT, timezone: "Asia/Kolkata", duration_minutes: 30, status: "pending" };
    routes["POST /public/bookings"] = () => [201, { message: "Booking created successfully", status: true, data: ack }];
    const request = form.buildBookingRequest(filled(), "Asia/Kolkata");
    let received;
    const action = await store.dispatch(slice.reqToCreateBooking({ data: request, onSuccess: (r) => { received = r; } }));
    assert.equal(action.type, "publicSlice/reqToCreateBooking/fulfilled");
    assert.deepEqual(received, ack);
    assert.deepEqual(calls[0].body, request);
});

test("a failed booking hands the code and field errors to onFailure", async () => {
    routes["POST /public/bookings"] = () => [409, { message: "You already have a demo request with us.", status: false, code: "DUPLICATE_OPEN_BOOKING" }];
    let failure;
    await store.dispatch(slice.reqToCreateBooking({ data: form.buildBookingRequest(filled(), "UTC"), onFailure: (e) => { failure = e; } }));
    assert.equal(failure.status, 409);
    assert.equal(failure.code, "DUPLICATE_OPEN_BOOKING");
});

test("availability asks for the visitor's dates in their timezone", async () => {
    routes["GET /public/bookings/availability"] = () => [200, { data: { business_timezone: "Asia/Kolkata", duration_minutes: 30, min_lead_minutes: 120, max_horizon_days: 60, days: [{ date: "2026-11-04", slots: [SLOT] }, { date: "2026-11-05", slots: [] }] } }];
    const action = await store.dispatch(slice.reqBookingAvailability({ data: { from: "2026-11-04", to: "2026-11-05", timezone: "Asia/Kolkata" } }));
    assert.deepEqual(calls[0].params, { from: "2026-11-04", to: "2026-11-05", timezone: "Asia/Kolkata" });
    assert.deepEqual(form.daysWithSlots(action.payload.days).map((d) => d.date), ["2026-11-04"]);
});
