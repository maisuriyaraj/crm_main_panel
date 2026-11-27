import type { AdPlatformKey } from "@/hooks/useAdManagerQuery";
import type { AdCampaignProviderState, AdConnectionStatus, AdProvider } from "@/lib/store/slices/adIntegrationsSlice";

// The platform switcher's options. "All" and WhatsApp are not connections of
// their own: All reads every connected platform at once, and Click-to-WhatsApp
// ads are Meta ads, so WhatsApp reads the Meta connection.
export type AdPlatformOption = {
  key: AdPlatformKey;
  label: string;
  // The platform whose figures this option reads; null for "All".
  provider: AdProvider | null;
  // The plan includes it (ads_enabled plus the platform's own flag).
  enabled: boolean;
  status: AdConnectionStatus | "not_enabled" | "unknown";
  // It can be chosen: there are figures behind it, even if stale.
  selectable: boolean;
  // Why it cannot be chosen, in the member's own terms.
  reason: string | null;
  // Offer "Connect" beside it rather than only a reason.
  offerConnect: boolean;
};

const WORDS: Partial<Record<AdConnectionStatus | "not_enabled" | "unknown", string>> = {
  not_configured: "OrbitOps hasn't set this platform up yet",
  not_connected: "Not connected yet",
  expired: "Needs connecting again",
  revoked: "Needs connecting again",
  error: "Needs connecting again",
  not_enabled: "Not part of your plan",
};

// A connection that still has stored figures behind it, even if no new ones can
// arrive: a member must be able to read the last figures while it is broken.
const HAS_FIGURES: (AdConnectionStatus | "not_enabled" | "unknown")[] = ["connected", "expired", "revoked", "error"];

export const buildPlatformOptions = ({
  states,
  flags,
}: {
  states: AdCampaignProviderState[];
  flags: { meta: boolean; google: boolean; whatsapp: boolean };
}): AdPlatformOption[] => {
  const stateOf = (provider: AdProvider) => states.find((entry) => entry.provider === provider);

  const one = (key: AdPlatformKey, label: string, provider: AdProvider, enabled: boolean): AdPlatformOption => {
    const state = stateOf(provider);
    // Until the first answer arrives nothing is claimed about the platform: the
    // option stays open so a slow network never looks like "not connected".
    const status = !enabled ? "not_enabled" : state ? state.connection_status : "unknown";
    const selectable = status === "unknown" || HAS_FIGURES.includes(status);
    return {
      key,
      label,
      provider,
      enabled,
      status,
      selectable,
      reason: selectable ? null : WORDS[status] ?? "Not available",
      offerConnect: status === "not_connected" || status === "not_configured",
    };
  };

  const meta = one("meta", "Meta Ads", "meta", flags.meta);
  const google = one("google", "Google Ads", "google", flags.google);

  // WhatsApp rides on the Meta connection, so it is only as available as Meta
  // is. Its own plan flag decides whether it is offered at all.
  const whatsapp: AdPlatformOption = {
    ...one("whatsapp", "WhatsApp Ads", "meta", flags.whatsapp && flags.meta),
    key: "whatsapp",
    label: "WhatsApp Ads",
  };
  const whatsappReason = !flags.whatsapp
    ? "Not part of your plan"
    : !flags.meta
      ? "WhatsApp ads run through Meta, which isn't part of your plan"
      : whatsapp.reason
        ? "WhatsApp ads run through your Meta connection, which needs attention"
        : null;

  const live = [meta, google].filter((option) => option.enabled);
  const all: AdPlatformOption = {
    key: "all",
    label: "All",
    provider: null,
    enabled: live.length > 0,
    status: live.some((option) => option.status === "connected") ? "connected" : live.length ? "not_connected" : "not_enabled",
    // Always open while the plan includes a platform: "All" is where a member
    // lands, and an empty list there is an answer, not a dead end.
    selectable: live.length > 0,
    reason: live.length > 0 ? null : "No ad platforms are part of your plan",
    offerConnect: false,
  };

  // A platform the plan does not sell is left out altogether rather than shown
  // as unavailable: there is nothing the workspace could do about it here.
  return [
    all,
    ...(flags.meta ? [meta] : []),
    ...(flags.google ? [google] : []),
    ...(flags.whatsapp ? [{ ...whatsapp, reason: whatsappReason, selectable: !whatsappReason }] : []),
  ];
};

export const optionFor = (options: AdPlatformOption[], key: AdPlatformKey) => options.find((option) => option.key === key);
