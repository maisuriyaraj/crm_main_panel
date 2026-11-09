// Converts the usage and notification API answers into lib/usage/types.ts, and
// formats their figures for display. Pure functions, so they can run anywhere.

import type {
  ApiUsageMeasure,
  AppNotification,
  HeldLeads,
  LimitRefusal,
  UsageMeasure,
  UsageState,
  UsageSummary,
} from "@/lib/usage/types";

// Shown when the API's own wording is not at hand (a request that failed early).
export const FALLBACK_UPGRADE_MESSAGE = "Ask your admin, or contact the OrbitOps team, to upgrade your plan.";

// API answers are untyped JSON; each field is checked before use.
type Raw = Record<string, unknown>;
const obj = (value: unknown): Raw => (value && typeof value === "object" ? (value as Raw) : {});
const str = (value: unknown): string | null => (typeof value === "string" && value ? value : null);

const num = (value: unknown): number | null => {
  if (value === null || value === undefined || value === "") return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
};

const stateOf = (value: unknown): UsageState => (value === "full" || value === "warning" ? value : "ok");

const mapMeasure = (input: unknown): UsageMeasure | null => {
  if (!input) return null;
  const raw = obj(input);
  const limit = num(raw.limit);
  return {
    used: num(raw.used) ?? 0,
    limit,
    unlimited: raw.unlimited === true || limit === null,
    percent: num(raw.percent),
    state: stateOf(raw.state),
    unit: raw.unit === "bytes" || raw.unit === "per_minute" ? raw.unit : "count",
    limitSource: raw.limit_source === "platform_default" ? "platform_default" : raw.limit_source === "plan" ? "plan" : undefined,
  };
};

const mapApiMeasure = (input: unknown): ApiUsageMeasure | null => {
  const base = mapMeasure(input);
  if (!base) return null;
  const raw = obj(input);
  return {
    ...base,
    peakDay: str(raw.peak_day),
    peakWindowDays: num(raw.peak_window_days) ?? 7,
    requests30Days: num(raw.requests_30_days) ?? 0,
    rateLimited30Days: num(raw.rate_limited_30_days) ?? 0,
  };
};

export const mapUsageFromApi = (input: unknown): UsageSummary => {
  const raw = obj(input);
  const measures = obj(raw.measures);
  const storage = mapMeasure(measures.storage);
  return {
    planId: raw.plan_id === null || raw.plan_id === undefined ? null : String(raw.plan_id),
    planName: str(raw.plan_name),
    measures: {
      users: mapMeasure(measures.users),
      leads: mapMeasure(measures.leads),
      storage: storage ? { ...storage, files: num(obj(measures.storage).files) ?? 0 } : null,
      api: mapApiMeasure(measures.api),
    },
    worstState: stateOf(raw.worst_state),
    checkedAt: str(raw.checked_at),
    isAdmin: raw.is_admin === true,
    upgradeMessage: str(raw.upgrade_message) ?? FALLBACK_UPGRADE_MESSAGE,
  };
};

export const mapHeldLeadsFromApi = (input: unknown): HeldLeads => {
  const raw = obj(input);
  return {
    held: num(raw.held) ?? 0,
    oldestAt: str(raw.oldest_at),
    tooOldToRelease: num(raw.too_old_to_release) ?? 0,
    releaseMaxAgeDays: num(raw.release_max_age_days) ?? 90,
  };
};

export const mapNotificationFromApi = (input: unknown): AppNotification => {
  const raw = obj(input);
  const payload = raw.payload && typeof raw.payload === "object" ? (raw.payload as Raw) : null;
  const type = str(raw.type) ?? "";
  return {
    id: String(raw.id),
    type,
    message: str(payload?.message) ?? type,
    payload,
    readAt: str(raw.read_at),
    createdAt: str(raw.created_at),
  };
};

const LIMIT_CODES = new Set(["LIMIT_REACHED", "SEAT_LIMIT_REACHED", "STORAGE_QUOTA_EXCEEDED"]);

// The refusal inside an Axios error, or null when the error is something else.
// The API's `message` already ends with the upgrade wording for the caller.
export const limitRefusalFrom = (error: unknown): LimitRefusal | null => {
  const body = obj((error as { response?: { data?: unknown } } | null)?.response?.data);
  const code = str(body.code);
  if (!code || !LIMIT_CODES.has(code)) return null;
  const data = obj(body.data);
  return {
    code,
    message: str(body.message) ?? FALLBACK_UPGRADE_MESSAGE,
    limit: str(body.limit) ?? (code === "SEAT_LIMIT_REACHED" ? "max_users" : null),
    used: num(body.used ?? data.seats_used),
    allowed: num(body.allowed ?? data.seats_limit),
    upgradeMessage: str(body.upgrade_message) ?? str(data.upgrade_message),
  };
};

// ─── Display ─────────────────────────────────────────────────────────────────

const UNITS = ["bytes", "KB", "MB", "GB", "TB"];

export const formatBytes = (bytes: number): string => {
  let value = Math.max(bytes, 0);
  let unit = 0;
  while (value >= 1024 && unit < UNITS.length - 1) {
    value /= 1024;
    unit += 1;
  }
  return `${unit === 0 ? value : value.toFixed(1)} ${UNITS[unit]}`;
};

// Indian grouping, as the rest of the panel shows counts.
export const formatCount = (value: number): string => value.toLocaleString("en-IN");

export const formatMeasureValue = (measure: UsageMeasure, value: number): string =>
  measure.unit === "bytes" ? formatBytes(value) : formatCount(value);

// The bar's fill, capped so an organization already over its limit shows a full bar.
export const barPercent = (measure: UsageMeasure): number => Math.min(100, Math.max(0, measure.percent ?? 0));

export const toneOf = (state: UsageState): "success" | "warning" | "destructive" =>
  state === "full" ? "destructive" : state === "warning" ? "warning" : "success";

export const stateLabel = (state: UsageState): string =>
  state === "full" ? "Limit reached" : state === "warning" ? "Nearing the limit" : "Within the limit";

const LABELS: Record<string, string> = { users: "users", leads: "leads", storage: "storage", api: "API requests" };

// The measures at warning or full, worst first, for the banner.
export const measuresNeedingAttention = (summary: UsageSummary): { key: string; label: string; state: UsageState }[] =>
  (Object.entries(summary.measures) as [string, UsageMeasure | null][])
    .filter(([, measure]) => measure && !measure.unlimited && measure.state !== "ok")
    .map(([key, measure]) => ({ key, label: LABELS[key] ?? key, state: (measure as UsageMeasure).state }))
    .sort((a, b) => (a.state === b.state ? 0 : a.state === "full" ? -1 : 1));

export const leadsFull = (summary: UsageSummary | null): boolean => summary?.measures.leads?.state === "full" && !summary.measures.leads.unlimited;
