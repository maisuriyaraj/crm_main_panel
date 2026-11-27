"use client";

import Link from "next/link";
import { useParams } from "next/navigation";

import { buildOrgRoute, pageRoutes } from "@/lib/constants";
import { cn } from "@/lib/utils";
import type { AdPlatformKey } from "@/hooks/useAdManagerQuery";
import type { AdPlatformOption } from "@/lib/ads/platforms";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

// All / Meta Ads / Google Ads / WhatsApp Ads. A platform the workspace cannot
// read is shown but not selectable, with "Connect" beside it when connecting is
// what would fix it — the member can see the whole product and what is missing,
// rather than a switcher that silently has fewer options than the product does.
export function AdPlatformSwitcher({
  options,
  value,
  onChange,
}: {
  options: AdPlatformOption[];
  value: AdPlatformKey;
  onChange: (next: AdPlatformKey) => void;
}) {
  const params = useParams<{ orgnization: string }>();
  const connectionsHref = buildOrgRoute(params?.orgnization ?? "", pageRoutes.adsManager);

  return (
    <TooltipProvider>
      <div className="flex flex-wrap items-center gap-2" role="group" aria-label="Ad platform">
        {options.map((option) => {
          const active = option.key === value;
          const button = (
            <Button
              type="button"
              size="sm"
              variant={active ? "default" : "outline"}
              aria-pressed={active}
              // Left in the tab order even when it cannot be chosen, so the
              // reason can be read rather than only seen.
              aria-disabled={!option.selectable}
              className={cn(!option.selectable && "opacity-60")}
              onClick={() => option.selectable && onChange(option.key)}
            >
              {option.label}
            </Button>
          );

          return (
            <span key={option.key} className="inline-flex items-center gap-1">
              {option.reason ? (
                <Tooltip>
                  <TooltipTrigger asChild>{button}</TooltipTrigger>
                  <TooltipContent>{option.reason}</TooltipContent>
                </Tooltip>
              ) : (
                button
              )}
              {option.offerConnect && (
                <Button size="sm" variant="link" className="h-auto px-1 py-0 text-xs" asChild>
                  <Link href={connectionsHref}>Connect</Link>
                </Button>
              )}
            </span>
          );
        })}
      </div>
    </TooltipProvider>
  );
}
