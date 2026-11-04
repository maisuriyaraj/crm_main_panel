// Lead attachments: the checks made before an upload, the plain-words errors,
// the list kept per lead, the feature flag, and download links that are asked
// for on every click and never kept. The API is simulated (no network).
import "./ts-resolver.mjs";
import { test, beforeEach } from "node:test";
import assert from "node:assert/strict";
import axios, { AxiosError } from "axios";
import { configureStore } from "@reduxjs/toolkit";
import { installBrowserEnv } from "./browser-env.mjs";
import { installAdapter } from "./fake-backend.mjs";

const env = installBrowserEnv();
const { Axios } = await import("../lib/axios/index.ts");
const files = await import("../lib/leads/attachments.ts");
const slice = await import("../lib/store/slices/leadAttachmentsSlice.ts");
const features = await import("../lib/store/slices/featuresSlice.ts");

const MB = 1024 * 1024;
const LINK = "https://api.cloudinary.com/v1_1/test/raw/download?signature=SECRET-SIGNED-LINK";
const usage = (used, limit) => ({ usedBytes: used, files: 1, limitBytes: limit, percentUsed: Math.round((used / limit) * 1000) / 10, limitSource: "plan" });

// ─── A fake API ──────────────────────────────────────────────────────────────

let calls;
let answers;
const row = (id, leadId, name = `file-${id}.pdf`) => ({ id, lead_id: leadId, file_name: name, file_type: "document", mime: "application/pdf", bytes: 2048, uploaded_by: 9, created_at: "2026-11-03T10:00:00.000Z" });

const reply = (config, status, data) => {
    const response = { status, statusText: String(status), data, headers: {}, config, request: {} };
    if (status >= 400) throw new AxiosError(`Request failed with status code ${status}`, AxiosError.ERR_BAD_REQUEST, config, {}, response);
    return response;
};

const adapter = async (config) => {
    const url = new URL(axios.getUri(config)).pathname;
    const key = `${config.method.toUpperCase()} ${url}`;
    calls.push({ key, config });
    const answer = answers[key];
    if (!answer) return reply(config, 404, { message: "Not found" });
    const { status = 200, data, delayMs, progress } = typeof answer === "function" ? answer(config) : answer;
    if (progress) progress.forEach((loaded) => config.onUploadProgress?.({ loaded, total: 100 }));
    if (delayMs) await new Promise((resolve) => setTimeout(resolve, delayMs));
    return reply(config, status, data);
};
installAdapter(Axios, adapter);

const makeStore = () => configureStore({ reducer: { leadAttachments: slice.default, features: features.default } });

beforeEach(() => {
    calls = [];
    answers = {
        "GET /api/leads/7/attachments": { data: { status: true, data: [row(1, 7, "proposal.pdf")] } },
        "GET /api/leads/8/attachments": { data: { status: true, data: [row(2, 8)] } },
        "GET /api/leads/7/attachments/1/download": { data: { status: true, data: { url: LINK, expires_at: "2026-11-03T10:05:00.000Z", file_name: "proposal.pdf" } } },
        "GET /api/storage/usage": { data: { status: true, data: { used_bytes: 990 * MB, files: 12, limit_bytes: 1024 * MB, percent_used: 96.7, limit_source: "plan" } } },
    };
    env.localStorage.clear();
    env.sessionStorage.clear();
});

// ─── Checks before sending ───────────────────────────────────────────────────

test("files the API would refuse are stopped before anything is sent", () => {
    const check = (name, size, known) => files.checkFileBeforeUpload({ name, size }, known);

    assert.equal(check("notes.pdf", 0), "This file is empty.");
    for (const name of ["virus.exe", "page.html", "logo.svg", "archive.zip", "no-extension"]) {
        assert.match(check(name, 100), /can't be attached/, name);
    }
    assert.match(check("photo.png", 10 * MB + 1), /largest image you can attach is 10\.0 MB/);
    assert.match(check("contract.docx", 10 * MB + 1), /largest document/);
    assert.match(check("demo.mp4", 90 * MB + 1), /largest video you can attach is 90\.0 MB/);

    for (const [name, size] of [["photo.JPG", 10 * MB], ["demo.mp4", 90 * MB], ["clip.webm", MB], ["contract.docx", MB], ["deck.pdf", 5]]) {
        assert.equal(check(name, size), null, name);
    }
});

test("a file that cannot fit in the organization's storage is stopped too, with the numbers", () => {
    const message = files.checkFileBeforeUpload({ name: "deck.pdf", size: 5 * MB }, usage(1020 * MB, 1024 * MB));
    assert.match(message, /storage is full: 1020\.0 MB of 1\.0 GB used \(99\.6%\)/);
    assert.match(message, /This file needs 5\.0 MB, but only 4\.0 MB is left/);
    assert.match(message, /Delete files you no longer need, or ask your admin about a larger plan/);
    assert.equal(files.checkFileBeforeUpload({ name: "deck.pdf", size: 3 * MB }, usage(1020 * MB, 1024 * MB)), null, "it still fits");
});

test("the file picker offers exactly the types the checks accept", () => {
    assert.equal(files.ACCEPT_ATTRIBUTE, ".jpg,.jpeg,.png,.gif,.webp,.mp4,.m4v,.webm,.pdf,.docx");
    for (const extension of files.ACCEPTED_EXTENSIONS) assert.ok(files.categoryOf(`a.${extension}`), extension);
});

test("sizes read the same way as the API's own messages", () => {
    assert.deepEqual([500, 2048, 1.5 * MB, 1024 * MB].map(files.formatBytes), ["500 bytes", "2.0 KB", "1.5 MB", "1.0 GB"]);
});

// ─── Errors in plain words ───────────────────────────────────────────────────

const apiError = (status, data) => new AxiosError("x", "ERR", {}, {}, { status, data, headers: {}, config: {}, statusText: "" });

test("the storage-limit answer is shown with the organization's real usage", () => {
    const full = apiError(413, { code: "STORAGE_QUOTA_EXCEEDED", message: "Server words" });
    assert.ok(files.isStorageFull(full));
    assert.match(files.describeUploadError(full, usage(1023 * MB, 1024 * MB), 2 * MB), /1023\.0 MB of 1\.0 GB used .* needs 2\.0 MB, but only 1\.0 MB is left/);
    assert.equal(files.describeUploadError(full, null), "Server words", "without usage, the API's own sentence");
    assert.ok(!files.isStorageFull(apiError(413, { code: "FILE_TOO_LARGE" })), "a single large file is a different problem");
});

test("every other failure has its own plain sentence", () => {
    assert.equal(files.describeUploadError(apiError(403, { code: "FEATURE_DISABLED" })), "File uploads are not available on your plan.");
    assert.equal(files.describeUploadError(apiError(403, { code: "FORBIDDEN" })), "You don't have permission to add files to this lead.");
    assert.equal(files.describeUploadError(apiError(413, { code: "FILE_TOO_LARGE", message: "This file is too large: the limit for this type is 10 MB" })), "This file is too large: the limit for this type is 10 MB");
    assert.equal(files.describeUploadError(apiError(415, { message: "The file name does not match its contents" })), "The file name does not match its contents");
    assert.match(files.describeUploadError(apiError(429, {})), /Too many uploads/);
    assert.match(files.describeUploadError(apiError(503, { message: "STORAGE_NOT_CONFIGURED internals" })), /not available right now/);
    assert.match(files.describeUploadError(new AxiosError("Network Error", "ERR_NETWORK", {}, {})), /did not reach the server/);
});

// ─── The list, per lead ──────────────────────────────────────────────────────

test("the list is loaded and mapped for the lead that is open", async () => {
    const store = makeStore();
    await store.dispatch(slice.reqToGetLeadAttachments({ data: { leadId: "7" } }));
    const state = store.getState().leadAttachments;
    assert.equal(state.leadId, "7");
    assert.deepEqual(state.items, [{ id: "1", leadId: "7", fileName: "proposal.pdf", fileType: "document", mime: "application/pdf", bytes: 2048, uploadedBy: "9", createdAt: "2026-11-03T10:00:00.000Z" }]);
});

test("opening another lead never shows the previous lead's files, even if they answer late", async () => {
    const store = makeStore();
    answers["GET /api/leads/7/attachments"] = { delayMs: 30, data: { data: [row(1, 7)] } };
    const late = store.dispatch(slice.reqToGetLeadAttachments({ data: { leadId: "7" } }));
    await store.dispatch(slice.reqToGetLeadAttachments({ data: { leadId: "8" } }));
    await late;
    assert.deepEqual(store.getState().leadAttachments.items.map((item) => item.id), ["2"]);
});

test("a failed load says so, and keeps no stale list", async () => {
    const store = makeStore();
    answers["GET /api/leads/7/attachments"] = { status: 500, data: { message: "boom" } };
    await store.dispatch(slice.reqToGetLeadAttachments({ data: { leadId: "7" } }));
    assert.equal(store.getState().leadAttachments.error, "boom");
    assert.deepEqual(store.getState().leadAttachments.items, []);
});

test("an upload sends one multipart file, reports its progress, and joins the list", async () => {
    const store = makeStore();
    await store.dispatch(slice.reqToGetLeadAttachments({ data: { leadId: "7" } }));
    answers["POST /api/leads/7/attachments"] = { status: 201, progress: [25, 100], data: { data: row(5, 7, "new.pdf") } };

    const progress = [];
    const file = new File(["%PDF-1.4"], "new.pdf", { type: "application/pdf" });
    await store.dispatch(slice.reqToUploadLeadAttachment({ data: { leadId: "7", file, onProgress: (p) => progress.push(p) } }));

    const sent = calls.find((call) => call.key === "POST /api/leads/7/attachments").config.data;
    assert.ok(sent instanceof FormData);
    assert.equal(sent.get("file").name, "new.pdf");
    assert.deepEqual(progress, [25, 100]);
    assert.deepEqual(store.getState().leadAttachments.items.map((item) => item.fileName), ["new.pdf", "proposal.pdf"]);
});

test("a refused upload hands the caller the API's answer and leaves the list alone", async () => {
    const store = makeStore();
    await store.dispatch(slice.reqToGetLeadAttachments({ data: { leadId: "7" } }));
    answers["POST /api/leads/7/attachments"] = { status: 413, data: { code: "STORAGE_QUOTA_EXCEEDED", message: "full" } };

    let failure;
    await store.dispatch(slice.reqToUploadLeadAttachment({
        data: { leadId: "7", file: new File(["x"], "a.pdf") },
        onFailure: (error) => { failure = error; },
    }));
    assert.ok(files.isStorageFull(failure));
    assert.equal(store.getState().leadAttachments.items.length, 1);

    await store.dispatch(slice.reqToGetStorageUsage({}));
    const fresh = store.getState().leadAttachments.usage;
    assert.deepEqual(fresh, { usedBytes: 990 * MB, files: 12, limitBytes: 1024 * MB, percentUsed: 96.7, limitSource: "plan" });
    assert.match(files.describeUploadError(failure, fresh, 40 * MB), /990\.0 MB of 1\.0 GB used \(96\.7%\)/);
});

test("a deleted file leaves the list", async () => {
    const store = makeStore();
    await store.dispatch(slice.reqToGetLeadAttachments({ data: { leadId: "7" } }));
    answers["DELETE /api/leads/7/attachments/1"] = { data: { status: true } };
    await store.dispatch(slice.reqToDeleteLeadAttachment({ data: { leadId: "7", attachmentId: "1" } }));
    assert.deepEqual(store.getState().leadAttachments.items, []);
    assert.ok(calls.some((call) => call.key === "DELETE /api/leads/7/attachments/1"));
});

// ─── Downloads ───────────────────────────────────────────────────────────────

test("every download asks for a fresh link and opens it at once", async () => {
    const opened = [];
    await files.openAttachment("7", "1", (url) => opened.push(url));
    await files.openAttachment("7", "1", (url) => opened.push(url));
    assert.equal(calls.filter((call) => call.key === "GET /api/leads/7/attachments/1/download").length, 2, "no link is reused");
    assert.deepEqual(opened, [LINK, LINK]);
});

test("a signed link is never kept: not in the store, not in browser storage, not returned", async () => {
    const store = makeStore();
    await store.dispatch(slice.reqToGetLeadAttachments({ data: { leadId: "7" } }));
    const result = await files.openAttachment("7", "1", () => {});
    assert.equal(result, undefined);
    assert.ok(!JSON.stringify(store.getState()).includes("SECRET-SIGNED-LINK"));
    assert.equal(env.localStorage.length, 0);
    assert.equal(env.sessionStorage.length, 0);
});

test("by default the link is handed to the browser to download, leaving the panel open", async () => {
    const assigned = [];
    globalThis.window.location.assign = (url) => assigned.push(url);
    await files.openAttachment("7", "1");
    assert.deepEqual(assigned, [LINK]);
});

test("a failed link request opens nothing", async () => {
    answers["GET /api/leads/7/attachments/1/download"] = { status: 404, data: { message: "Attachment not found" } };
    const opened = [];
    await assert.rejects(files.openAttachment("7", "1", (url) => opened.push(url)));
    assert.deepEqual(opened, []);
});

// ─── Feature flag ────────────────────────────────────────────────────────────

test("the section shows only when storage is on, and stays hidden until the flags are known", async () => {
    const store = makeStore();
    const on = () => features.isFeatureOn(store.getState().features, "storage_enabled");
    assert.equal(on(), false, "not loaded yet");

    answers["GET /api/features"] = { data: { data: { crm_enabled: true, storage_enabled: true } } };
    await store.dispatch(features.reqToGetFeatures({}));
    assert.equal(on(), true);

    answers["GET /api/features"] = { data: { data: { crm_enabled: true, storage_enabled: false } } };
    await store.dispatch(features.reqToGetFeatures({}));
    assert.equal(on(), false);

    answers["GET /api/features"] = { data: { data: { crm_enabled: true } } };
    await store.dispatch(features.reqToGetFeatures({}));
    assert.equal(on(), false, "a flag the API did not send counts as off");
});

test("if the flags cannot be loaded, the section stays hidden", async () => {
    const store = makeStore();
    answers["GET /api/features"] = { status: 500, data: { message: "boom" } };
    await store.dispatch(features.reqToGetFeatures({}));
    assert.equal(features.isFeatureOn(store.getState().features, "storage_enabled"), false);
});
