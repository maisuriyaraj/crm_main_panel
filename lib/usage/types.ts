// What the organization uses against its plan's limits (GET /app/usage).

export type UsageState = "ok" | "warning" | "full";
export type UsageMeasureKey = "users" | "leads" | "storage" | "api";

export interface UsageMeasure {
  used: number;
  // Empty when the plan has no limit for it (users and leads only).
  limit: number | null;
  unlimited: boolean;
  // One decimal; can pass 100 when an organization was already over a lowered limit.
  percent: number | null;
  state: UsageState;
  unit: "count" | "bytes" | "per_minute";
  limitSource?: "plan" | "platform_default";
}

export interface ApiUsageMeasure extends UsageMeasure {
  peakDay: string | null;
  peakWindowDays: number;
  requests30Days: number;
  rateLimited30Days: number;
}

export interface UsageSummary {
  planId: string | null;
  planName: string | null;
  measures: {
    users: UsageMeasure | null;
    leads: UsageMeasure | null;
    storage: (UsageMeasure & { files: number }) | null;
    api: ApiUsageMeasure | null;
  };
  worstState: UsageState;
  checkedAt: string | null;
  // Decided by the API from the caller's role: who gets the admin wording,
  // the held-leads notice and the banner.
  isAdmin: boolean;
  upgradeMessage: string;
}

export interface HeldLeads {
  held: number;
  oldestAt: string | null;
  tooOldToRelease: number;
  releaseMaxAgeDays: number;
}

// A create refused at a plan limit (409 LIMIT_REACHED, 413 STORAGE_QUOTA_EXCEEDED,
// 409 SEAT_LIMIT_REACHED), in one shape.
export interface LimitRefusal {
  code: string;
  message: string;
  limit: string | null;
  used: number | null;
  allowed: number | null;
  upgradeMessage: string | null;
}

export interface AppNotification {
  id: string;
  type: string;
  message: string;
  payload: Record<string, unknown> | null;
  readAt: string | null;
  createdAt: string | null;
}
