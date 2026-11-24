"use client";

import { useAppSelector } from "@/lib/store/hooks";
import { listSlotOf } from "@/lib/store/slices/listViewsSlice";
import { CONTACT_FIELD_HELP, LEAD_FIELD_HELP } from "@/lib/lists/help-text";

// The ⓘ help for one list's fields (SRS SH-L8). The API serves it with the
// member's column choices, so the table header, the column chooser and the
// record's own form all explain a field with the same words and a wording fix
// ships from the server alone.
//
// The local map in lib/lists/help-text.ts is the fallback: a form can be opened
// before the list preferences have come back, and a dialog should never show a
// bare label where it means to explain something.
const FALLBACK: Record<string, Record<string, string>> = {
  leads: LEAD_FIELD_HELP,
  contacts: CONTACT_FIELD_HELP,
};

export function useFieldHelp(listKey: "leads" | "contacts") {
  const served = useAppSelector((state) => listSlotOf(state.listViews as any, listKey).preferences?.fieldHelp);

  return (fieldKey: string): string | undefined =>
    served?.[fieldKey] ?? FALLBACK[listKey]?.[fieldKey];
}
