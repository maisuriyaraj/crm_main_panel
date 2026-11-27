import { pageRoutes } from "@/lib/constants";

// The Ad Manager's tabs. All six the product asks for are here, including the
// five whose feature has not been built: a tab that quietly disappears reads as
// a missing feature, while one that leads to a not-found page reads as a broken
// app. Each unbuilt tab opens a page that says plainly what is still to come.
export type AdManagerTabKey =
  | "campaigns"
  | "ad-sets"
  | "creatives"
  | "audiences"
  | "ab-testing"
  | "analytics"
  | "connections";

export type AdManagerTab = {
  key: AdManagerTabKey;
  label: string;
  route: string;
  // False while the feature behind the tab has not been built.
  built: boolean;
  // What the tab will show, said in the member's own terms.
  blurb?: string;
};

export const AD_MANAGER_TABS: AdManagerTab[] = [
  { key: "campaigns", label: "Campaigns", route: pageRoutes.adsManagerCampaigns, built: true },
  {
    key: "ad-sets",
    label: "Ad Sets",
    route: pageRoutes.adsManagerAdSets,
    built: false,
    blurb: "Ad sets group the ads inside a campaign and hold the audience, placement and schedule each group is shown with.",
  },
  {
    key: "creatives",
    label: "Creatives",
    route: pageRoutes.adsManagerCreatives,
    built: false,
    blurb: "Creatives are the images, videos and text your ads are made of, with how each one performed.",
  },
  {
    key: "audiences",
    label: "Audiences",
    route: pageRoutes.adsManagerAudiences,
    built: false,
    blurb: "Audiences are the groups of people your ads are shown to, including lists built from your own CRM contacts.",
  },
  {
    key: "ab-testing",
    label: "A/B testing",
    route: pageRoutes.adsManagerAbTesting,
    built: false,
    blurb: "A/B testing runs two versions of an ad against each other and tells you which one did better.",
  },
  {
    key: "analytics",
    label: "Analytics",
    route: pageRoutes.adsManagerAnalytics,
    built: false,
    blurb: "Analytics brings the spend, reach and conversion figures together into charts across every platform.",
  },
  // Not one of the product's six tabs, but the page the switcher's "Connect"
  // links and every "connect again" notice already point at, so it belongs in
  // the same strip rather than being reachable only from the sidebar.
  { key: "connections", label: "Connections", route: pageRoutes.adsManager, built: true },
];

export const SIX_TABS = AD_MANAGER_TABS.filter((tab) => tab.key !== "connections");

export const tabByKey = (key: AdManagerTabKey) => AD_MANAGER_TABS.find((tab) => tab.key === key);

// Which tab a path is on. The connections page is the area's own root, so it is
// matched last: every other tab's route starts with it.
export const activeTab = (pathname: string): AdManagerTab | undefined =>
  AD_MANAGER_TABS.find((tab) => tab.key !== "connections" && pathname.endsWith(tab.route)) ??
  AD_MANAGER_TABS.find((tab) => tab.key === "connections" && pathname.endsWith(tab.route));
