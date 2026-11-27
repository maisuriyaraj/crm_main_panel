"use client";

import { useCallback, useMemo } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

import { rangeForPreset, type AdDateRange, type AdRangePreset } from "@/lib/ads/format";

// Which platform the Ad Manager is showing. WhatsApp is not a connection of its
// own: Click-to-WhatsApp ads are Meta ads, so it reads the Meta figures.
export type AdPlatformKey = "all" | "meta" | "google" | "whatsapp";

const PLATFORM_KEYS: AdPlatformKey[] = ["all", "meta", "google", "whatsapp"];
const PRESETS: AdRangePreset[] = ["7d", "30d", "month", "custom"];

const DEFAULT_PLATFORM: AdPlatformKey = "all";
// Typed without "custom" so it can be handed to `rangeForPreset`, which only
// works out the fixed ranges.
const DEFAULT_PRESET: Exclude<AdRangePreset, "custom"> = "30d";

// The header's controls and the tab below it must always agree, so the chosen
// platform, date range and search live in the URL rather than in either one's
// own state: the layout writes them, every tab reads them, and a link someone
// shares or a page they reload opens on the same view.
export function useAdManagerQuery() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const platform = useMemo<AdPlatformKey>(() => {
    const asked = searchParams.get("platform") as AdPlatformKey | null;
    return asked && PLATFORM_KEYS.includes(asked) ? asked : DEFAULT_PLATFORM;
  }, [searchParams]);

  const preset = useMemo<AdRangePreset>(() => {
    const asked = searchParams.get("range") as AdRangePreset | null;
    return asked && PRESETS.includes(asked) ? asked : DEFAULT_PRESET;
  }, [searchParams]);

  // A preset is worked out from today rather than trusted from the URL, so an
  // old link saying "last 7 days" still means the last seven days. Only a
  // custom range takes its days from the URL.
  const range = useMemo<AdDateRange>(() => {
    if (preset !== "custom") return rangeForPreset(preset);
    const fallback = rangeForPreset(DEFAULT_PRESET);
    return {
      from: searchParams.get("from") || fallback.from,
      to: searchParams.get("to") || fallback.to,
    };
  }, [preset, searchParams]);

  const search = searchParams.get("q") ?? "";
  const pageAsked = Number(searchParams.get("page"));
  const page = Number.isFinite(pageAsked) && pageAsked >= 1 ? Math.floor(pageAsked) : 1;

  // One writer for every control. An empty value drops its parameter instead of
  // leaving "?q=" behind, and anything that changes what is being listed starts
  // again at page 1, because the old page may not exist in the new result.
  const write = useCallback(
    (changes: Record<string, string | number | null>, { resetPage = true } = {}) => {
      const params = new URLSearchParams(searchParams.toString());
      Object.entries(changes).forEach(([key, value]) => {
        if (value === null || value === "") params.delete(key);
        else params.set(key, String(value));
      });
      if (resetPage) params.delete("page");
      const query = params.toString();
      router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false });
    },
    [pathname, router, searchParams],
  );

  const setPlatform = useCallback((next: AdPlatformKey) => write({ platform: next === DEFAULT_PLATFORM ? null : next }), [write]);

  const setPreset = useCallback(
    (next: AdRangePreset) => {
      // A custom range needs days to start from, so it opens on whatever the
      // previous preset was showing instead of two empty date boxes.
      if (next === "custom") return write({ range: "custom", from: range.from, to: range.to });
      return write({ range: next === DEFAULT_PRESET ? null : next, from: null, to: null });
    },
    [range.from, range.to, write],
  );

  const setCustomDay = useCallback(
    (key: "from" | "to", value: string) => write({ range: "custom", from: key === "from" ? value : range.from, to: key === "to" ? value : range.to }),
    [range.from, range.to, write],
  );

  const setSearch = useCallback((value: string) => write({ q: value.trim() || null }), [write]);

  const setPage = useCallback((next: number) => write({ page: next > 1 ? next : null }, { resetPage: false }), [write]);

  return { platform, preset, range, search, page, setPlatform, setPreset, setCustomDay, setSearch, setPage };
}
