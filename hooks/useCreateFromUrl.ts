"use client";

import { useEffect, useRef } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

// Lets the top bar's Create (+) menu open a module's own create dialog, which
// lives in that page's state and so can't be reached from the layout. The menu
// links to `?new=1`; this opens the form once and drops the param, so the dialog
// doesn't reopen on a refresh or when the user comes back with the Back button.
export function useCreateFromUrl(openCreate: () => void, param = "new") {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  // The page passes a fresh function each render, so the effect below re-runs
  // often; this is what keeps it to one open per visit of the flag.
  const handled = useRef(false);

  const flag = searchParams.get(param);

  useEffect(() => {
    if (flag !== "1") {
      handled.current = false;
      return;
    }
    if (handled.current) return;
    handled.current = true;

    openCreate();

    const next = new URLSearchParams(searchParams.toString());
    next.delete(param);
    const query = next.toString();
    router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false });
  }, [flag, param, pathname, router, searchParams, openCreate]);
}
