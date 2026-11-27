"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { usePathname, useParams } from "next/navigation";
import { Megaphone, Plus, Search, Target } from "lucide-react";

import { useAuth } from "@/hooks/useAuth";
import { useAdManagerQuery } from "@/hooks/useAdManagerQuery";
import { buildOrgRoute, pageRoutes } from "@/lib/constants";
import { cn } from "@/lib/utils";
import { RANGE_LABELS, type AdRangePreset } from "@/lib/ads/format";
import { AD_MANAGER_TABS, activeTab } from "@/lib/ads/manager-tabs";
import { buildPlatformOptions } from "@/lib/ads/platforms";
import { useAppDispatch, useAppSelector } from "@/lib/store/hooks";
import { isFeatureOn } from "@/lib/store/slices/featuresSlice";
import { reqToGetAdPlatformStates } from "@/lib/store/slices/adIntegrationsSlice";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AdComingSoonDialog } from "@/components/ads/coming-soon";
import { AdPlatformSwitcher } from "@/components/ads/platform-switcher";

// Long enough that typing a campaign name isn't one request per letter, short
// enough that the list feels like it is following along.
const SEARCH_DEBOUNCE_MS = 400;

const TAGLINE = "Plan, launch, and optimize campaigns across every channel";

// Everything above every Ad Manager tab: where you are, what the page is, the
// two header actions, the campaign search, the platform switcher, the date
// range and the tab strip. It lives in the area's layout so switching tabs
// never rebuilds it, and the controls it owns are written to the URL so each
// tab reads the same choice rather than being handed it through props.
export function AdManagerShell() {
  const dispatch = useAppDispatch();
  const params = useParams<{ orgnization: string }>();
  const pathname = usePathname();
  const { can } = useAuth();
  const org = params?.orgnization ?? "";

  const features = useAppSelector((state) => state.features);
  const { platformStates, platformStatesLoaded } = useAppSelector((state) => state.adIntegrations);
  const { platform, preset, range, search, setPlatform, setPreset, setCustomDay, setSearch } = useAdManagerQuery();

  const [comingSoon, setComingSoon] = useState<{ title: string; blurb?: string } | null>(null);
  const [searchInput, setSearchInput] = useState(search);
  // The last term this box put into the URL, so a term that came from anywhere
  // else can be told apart from the box's own writing.
  const pushed = useRef(search);

  const tab = activeTab(pathname);
  const onCampaigns = tab?.key === "campaigns";
  const adsOn = isFeatureOn(features, "ads_enabled");

  const options = useMemo(
    () =>
      buildPlatformOptions({
        states: platformStates,
        flags: {
          meta: adsOn && isFeatureOn(features, "ads_meta"),
          google: adsOn && isFeatureOn(features, "ads_google"),
          whatsapp: adsOn && isFeatureOn(features, "ads_whatsapp"),
        },
      }),
    [adsOn, features, platformStates],
  );

  // One platform's campaign list says nothing about the others, so the switcher
  // asks for the platform states itself in that case. Asking for every platform
  // already answers it, so no second request is made then.
  useEffect(() => {
    if (onCampaigns && adsOn && !platformStatesLoaded && platform !== "all") {
      dispatch(reqToGetAdPlatformStates({ data: null }));
    }
  }, [dispatch, onCampaigns, adsOn, platformStatesLoaded, platform]);

  // The box keeps what is being typed; the URL only gets the settled term, so
  // the list is not re-fetched on every keystroke.
  useEffect(() => {
    // Compared trimmed, because that is what reaches the URL: a trailing space
    // would otherwise look like a new term for ever.
    if (searchInput.trim() === search) return;
    const timer = setTimeout(() => {
      pushed.current = searchInput.trim();
      setSearch(searchInput);
    }, SEARCH_DEBOUNCE_MS);
    return () => clearTimeout(timer);
    // `setSearch` and `search` are left out on purpose: this watches what the
    // member types, and reacting to the URL it writes would undo their typing.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchInput]);

  // A term that arrived from somewhere other than this box — the browser's Back
  // button, or a shared link — is adopted into it, so going back really goes
  // back instead of the box putting the old term straight into the URL again.
  useEffect(() => {
    if (search !== pushed.current) {
      pushed.current = search;
      setSearchInput(search);
    }
  }, [search]);

  if (!can("ads.view")) return null;

  return (
    <div className="space-y-5">
      <Breadcrumb>
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbLink asChild>
              <Link href={buildOrgRoute(org, pageRoutes.dashboard)}>Home</Link>
            </BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbPage>Ad Manager</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>

      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h1 className="flex items-center gap-2 text-2xl font-bold">
            <Megaphone className="size-6 text-primary" aria-hidden /> Ad Manager
          </h1>
          <p className="mt-1 text-muted-foreground">{TAGLINE}</p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {onCampaigns && (
            <div className="relative">
              <Search className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
              <Label className="sr-only" htmlFor="ads-search">
                Search campaigns
              </Label>
              <Input
                id="ads-search"
                type="search"
                className="w-56 pl-8"
                placeholder="Search campaigns"
                value={searchInput}
                onChange={(event) => setSearchInput(event.target.value)}
              />
            </div>
          )}
          <Button
            variant="outline"
            onClick={() =>
              setComingSoon({
                title: "Pixel & tracking",
                blurb: "Pixel and conversion tracking will let you record what happened on your own site after someone clicked an ad, and tie it back to a lead.",
              })
            }
          >
            <Target aria-hidden /> Pixel &amp; tracking
          </Button>
          <Button
            onClick={() =>
              setComingSoon({
                title: "Create campaign",
                blurb: "Creating a campaign from OrbitOps will write it straight to Meta or Google.",
              })
            }
          >
            <Plus aria-hidden /> Create campaign
          </Button>
        </div>
      </div>

      {/* The switcher and the date range belong to the figures, so they are
          shown where there are figures rather than above an empty tab. */}
      {onCampaigns && (
        <div className="flex flex-wrap items-end justify-between gap-3">
          {/* Held back until the plan's flags have arrived: before that every
              platform would look as though it weren't sold. */}
          {features.isLoaded && <AdPlatformSwitcher options={options} value={platform} onChange={setPlatform} />}

          <div className="flex flex-wrap items-end gap-3">
            <div className="space-y-1">
              <Label htmlFor="ads-range">Date range</Label>
              <Select value={preset} onValueChange={(value) => setPreset(value as AdRangePreset)}>
                <SelectTrigger id="ads-range" className="w-40">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {(Object.keys(RANGE_LABELS) as AdRangePreset[]).map((key) => (
                    <SelectItem key={key} value={key}>
                      {RANGE_LABELS[key]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {preset === "custom" && (
              <>
                <div className="space-y-1">
                  <Label htmlFor="ads-from">From</Label>
                  <Input
                    id="ads-from"
                    type="date"
                    className="w-40"
                    value={range.from}
                    max={range.to}
                    onChange={(event) => setCustomDay("from", event.target.value)}
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="ads-to">To</Label>
                  <Input
                    id="ads-to"
                    type="date"
                    className="w-40"
                    value={range.to}
                    min={range.from}
                    onChange={(event) => setCustomDay("to", event.target.value)}
                  />
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* All six tabs the product asks for, plus the connections page the
          switcher's "Connect" links point at. A tab whose feature isn't built
          still opens: its page says so. */}
      <nav className="-mb-px flex flex-wrap items-center gap-1 overflow-x-auto border-b" aria-label="Ad Manager sections">
        {AD_MANAGER_TABS.map((entry) => {
          const current = tab?.key === entry.key;
          return (
            <Link
              key={entry.key}
              href={buildOrgRoute(org, entry.route)}
              aria-current={current ? "page" : undefined}
              className={cn(
                "whitespace-nowrap border-b-2 px-3 py-2 text-sm transition-colors",
                current
                  ? "border-primary font-medium text-foreground"
                  : "border-transparent text-muted-foreground hover:text-foreground",
                entry.key === "connections" && "ml-auto",
              )}
            >
              {entry.label}
              {!entry.built && <span className="ml-1.5 text-xs text-muted-foreground">· soon</span>}
            </Link>
          );
        })}
      </nav>

      <AdComingSoonDialog
        open={!!comingSoon}
        onOpenChange={(next) => !next && setComingSoon(null)}
        title={comingSoon?.title ?? ""}
        blurb={comingSoon?.blurb}
      />
    </div>
  );
}
