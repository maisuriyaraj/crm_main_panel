"use client";

import Link from "next/link";
import { useParams, usePathname } from "next/navigation";

import { buildOrgRoute, pageRoutes } from "@/lib/constants";
import { workspacePath } from "@/lib/onboarding";
import { useAppSelector } from "@/lib/store/hooks";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";

// Plain words for the segments the URL uses. Anything not listed is title-cased,
// so a new module reads sensibly here before it gets an entry of its own.
const SEGMENT_LABELS: Record<string, string> = {
  dashboard: "Dashboard",
  leads: "Leads",
  contacts: "Contacts",
  settings: "Settings",
  team: "Team",
  roles: "Roles",
  new: "New role",
  billing: "Billing",
  security: "Security",
  usage: "Plan & usage",
  integrations: "Integrations",
  setup: "Company setup",
  "ads-manager": "Ads Manager",
  campaigns: "Campaigns",
};

// Segments that have no page of their own: shown as plain text, never as a link,
// so the trail never offers a route that would 404.
const NOT_A_PAGE = new Set(["settings", "roles"]);

const titleCase = (segment: string) =>
  segment.replace(/-/g, " ").replace(/\b\w/g, (character) => character.toUpperCase());

// Home > Leads, Home > Settings > Team > Sales Manager. Built from the route
// segments, except the last one on a detail page: there the entity's own name is
// used. The role editor already holds its role in Redux, so that name is read
// from the store rather than fetched again.
export function AppBreadcrumb() {
  const pathname = usePathname();
  const params = useParams<{ orgnization: string }>();
  const roleDetail = useAppSelector((state) => state.teamRoles.detail);
  const orgSlug = params?.orgnization ?? "";

  const path = workspacePath(pathname);
  const segments = path.split("/").filter(Boolean);

  // The dashboard *is* home, so it never repeats itself.
  const isHome = segments.length === 0 || path === pageRoutes.dashboard;

  const crumbs = segments.map((segment, index) => {
    const isLast = index === segments.length - 1;
    const previous = segments[index - 1];
    // A role id is opaque in the URL; the role's own label is what a person reads.
    const isRoleId = previous === "roles" && segment !== "new";
    const label = isRoleId
      ? roleDetail?.label || roleDetail?.name || "Role"
      : SEGMENT_LABELS[segment] ?? titleCase(segment);

    return {
      label,
      href: buildOrgRoute(orgSlug, `/${segments.slice(0, index + 1).join("/")}`),
      // The last crumb is where we already are, and some middles have no page.
      linked: !isLast && !NOT_A_PAGE.has(segment) && !isRoleId,
    };
  });

  return (
    <Breadcrumb className="min-w-0">
      {/* Only the trail scrolls if it ever has to, never the page. */}
      <BreadcrumbList className="flex-nowrap overflow-hidden">
        <BreadcrumbItem>
          {isHome ? (
            <BreadcrumbPage>Home</BreadcrumbPage>
          ) : (
            <BreadcrumbLink asChild>
              <Link href={buildOrgRoute(orgSlug, pageRoutes.dashboard)}>Home</Link>
            </BreadcrumbLink>
          )}
        </BreadcrumbItem>

        {!isHome &&
          crumbs.map((crumb, index) => (
            <span key={`${crumb.href}-${index}`} className="contents">
              <BreadcrumbSeparator />
              <BreadcrumbItem className="min-w-0">
                {crumb.linked ? (
                  <BreadcrumbLink asChild>
                    <Link href={crumb.href} className="truncate">
                      {crumb.label}
                    </Link>
                  </BreadcrumbLink>
                ) : (
                  <BreadcrumbPage className="truncate">{crumb.label}</BreadcrumbPage>
                )}
              </BreadcrumbItem>
            </span>
          ))}
      </BreadcrumbList>
    </Breadcrumb>
  );
}
