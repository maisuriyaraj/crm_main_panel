// lib/contracts/bookings.contract.json is copied from the backend
// (crm_backend/contract/). When it changes, copy it here and fix whatever this
// test then reports: the Book a Demo form must allow exactly what the API does.
import "./ts-resolver.mjs";
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const contract = JSON.parse(readFileSync(new URL("../lib/contracts/bookings.contract.json", import.meta.url), "utf8"));
const types = await import("../lib/types/booking.ts");
const form = await import("../lib/bookings/bookDemo.ts");

const SLOT = "2026-11-04T05:30:00.000Z";
const valid = {
    ...form.initialBookDemoValues,
    fullName: "Asha Rao",
    businessEmail: "asha@acme.in",
    businessName: "Acme Traders",
    teamSize: "11-50",
    preferredDate: "2026-11-04",
    preferredSlot: SLOT,
};
const accepts = (overrides) => form.bookDemoSchema([SLOT]).isValidSync({ ...valid, ...overrides });

test("team sizes match the API", () => {
    assert.deepEqual([...types.TEAM_SIZES], contract.team_sizes);
});

test("text limits match the API", () => {
    const { limits } = contract;
    for (const [field, limit] of [["fullName", limits.full_name], ["businessName", limits.organization_name], ["message", limits.business_requirements]]) {
        assert.equal(accepts({ [field]: "x".repeat(limit.max) }), true, `${field} at ${limit.max}`);
        assert.equal(accepts({ [field]: "x".repeat(limit.max + 1) }), false, `${field} over ${limit.max}`);
        if (limit.min) {
            assert.equal(accepts({ [field]: "x".repeat(limit.min) }), true, `${field} at ${limit.min}`);
            assert.equal(accepts({ [field]: "x".repeat(limit.min - 1) }), false, `${field} under ${limit.min}`);
        }
    }
    assert.equal(form.MESSAGE_MAX, limits.business_requirements.max);
    assert.equal(accepts({ phoneNumber: `+${"9".repeat(limits.mobile.max - 1)}` }), true, "phone at the limit");
    assert.equal(accepts({ phoneNumber: `+${"9".repeat(limits.mobile.max)}` }), false, "phone over the limit");
});
