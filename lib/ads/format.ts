// Showing ad figures. Two rules the API's shape forces on every screen:
// money always carries the ad account's own currency (two accounts in different
// currencies are never added together), and a missing number is said as "—",
// never as zero.

export type AdDateRange = { from: string; to: string };
export type AdRangePreset = "7d" | "30d" | "month" | "custom";

const DAY_MS = 24 * 60 * 60 * 1000;

export const toDayString = (date: Date) => date.toISOString().slice(0, 10);

// The ranges the SRS asks for on the Ad Manager header (last 7 days, last 30
// days, this month), worked out from today.
export const rangeForPreset = (preset: Exclude<AdRangePreset, "custom">, now = new Date()): AdDateRange => {
  const to = toDayString(now);
  if (preset === "month") {
    return { from: toDayString(new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1))), to };
  }
  const days = preset === "7d" ? 7 : 30;
  return { from: toDayString(new Date(now.getTime() - (days - 1) * DAY_MS)), to };
};

export const RANGE_LABELS: Record<AdRangePreset, string> = {
  "7d": "Last 7 days",
  "30d": "Last 30 days",
  month: "This month",
  custom: "Custom",
};

// The API sends money in the account currency's smallest unit (paise, cents) as
// a whole number. Dividing by 100 assumes two decimal places, which is what both
// ad platforms report for the currencies OrbitOps supports; a currency without
// decimals would need its own rule here.
export const formatMoneyMinor = (minor: number | null | undefined, currency: string | null | undefined) => {
  if (minor === null || minor === undefined) return "—";
  const amount = Number(minor) / 100;
  if (!currency) return amount.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  try {
    return new Intl.NumberFormat("en-IN", { style: "currency", currency, maximumFractionDigits: 2 }).format(amount);
  } catch {
    // An unknown or made-up currency code must not break the whole table.
    return `${currency} ${amount.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  }
};

export const formatCount = (value: number | null | undefined) =>
  value === null || value === undefined ? "—" : Number(value).toLocaleString("en-IN");

// Click-through rate comes from the API already worked out, as a percentage with
// two decimals; null means there were no impressions to divide by.
export const formatPercent = (value: number | null | undefined) =>
  value === null || value === undefined ? "—" : `${Number(value).toFixed(2)}%`;

export const formatDateTime = (value: string | null | undefined) =>
  value
    ? new Date(value).toLocaleString("en-IN", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })
    : null;

export const formatDay = (value: string | null | undefined) =>
  value ? new Date(value).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }) : null;

// "4 minutes ago", for the last-synced line. Anything older than a day is given
// as a date instead, which is easier to read than "37 hours ago".
export const describeAgo = (value: string | null | undefined, now = Date.now()) => {
  if (!value) return "never";
  const ms = now - new Date(value).getTime();
  if (!Number.isFinite(ms) || ms < 0) return formatDateTime(value) ?? "never";
  const minutes = Math.floor(ms / 60000);
  if (minutes < 1) return "just now";
  if (minutes === 1) return "1 minute ago";
  if (minutes < 60) return `${minutes} minutes ago`;
  const hours = Math.floor(minutes / 60);
  if (hours === 1) return "1 hour ago";
  if (hours < 24) return `${hours} hours ago`;
  return formatDateTime(value) ?? "never";
};

// How long until Refresh is allowed again. The API refuses a second sync within
// five minutes of the last one, so the button counts down instead of failing.
export const REFRESH_GAP_MS = 5 * 60 * 1000;

export const refreshWaitSeconds = (lastSyncedAt: string | null | undefined, now = Date.now()) => {
  if (!lastSyncedAt) return 0;
  const elapsed = now - new Date(lastSyncedAt).getTime();
  if (!Number.isFinite(elapsed) || elapsed < 0) return 0;
  return elapsed >= REFRESH_GAP_MS ? 0 : Math.ceil((REFRESH_GAP_MS - elapsed) / 1000);
};

export const countdownText = (seconds: number) => {
  const minutes = Math.floor(seconds / 60);
  const rest = seconds % 60;
  return `${minutes}:${String(rest).padStart(2, "0")}`;
};
