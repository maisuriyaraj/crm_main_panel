"use client";

import { AdTabPlaceholder } from "@/components/ads/tab-placeholder";

// A/B testing is one of the Ad Manager's tabs, so it has a real page: the tab is
// part of the product even though the feature behind it hasn't been built, and
// a tab that leads to a not-found page reads as a broken app. What this page
// shows is decided by the shared placeholder, which checks the member's access
// and the organization's plan first.
export default function AdAbTestingPage() {
  return <AdTabPlaceholder tab="ab-testing" />;
}
