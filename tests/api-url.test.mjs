// Own file (own process): API_BASE_URL is read once, when constants load.
import "./ts-resolver.mjs";
import { test } from "node:test";
import assert from "node:assert/strict";

process.env.NEXT_PUBLIC_API_URL = "https://api.example.com/api";
const { apiUrl, apiRoutes } = await import("../lib/constants.ts");

test("apiUrl joins with exactly one slash, whatever either side carries", () => {
    assert.equal(apiUrl(apiRoutes.logout), "https://api.example.com/api/auth/logout");
    assert.equal(apiUrl("auth/logout"), "https://api.example.com/api/auth/logout");
    assert.equal(apiUrl("//auth/logout"), "https://api.example.com/api/auth/logout");
});
