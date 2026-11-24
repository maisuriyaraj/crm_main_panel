// Shapes for the shared list contract the API exposes (see
// backend/specs/tenant-shell/list-behaviours/spec.md). Every list screen —
// Leads, Contacts, and whatever comes next — pages, sorts, filters, remembers
// its columns and saves its views through these, so one change lands everywhere.
//
// Wire fields stay snake_case on the way out (the API's query names) and are
// mapped to camelCase on the way in, the same split the leads and contacts
// mappers already use.

export type ListKey = "leads" | "contacts";

// The API offers exactly these page sizes and refuses anything else with
// INVALID_PER_PAGE, so the selector must not offer a fifth value.
export const PER_PAGE_OPTIONS = [10, 25, 50, 100] as const;
export type PerPage = (typeof PER_PAGE_OPTIONS)[number];
export const DEFAULT_PER_PAGE: PerPage = 10;

export const isPerPage = (value: number): value is PerPage =>
  (PER_PAGE_OPTIONS as readonly number[]).includes(value);

export interface ListPagination {
  total: number;
  page: number;
  perPage: number;
  // The two ends of the page, for the "1–10 of 46 items" line. `from` is 0 when
  // the page is empty, so the line can say "0 items" rather than "1–0".
  from: number;
  to: number;
  totalPages: number;
}

// The API sends both the old names (limit, totalPages) and the new ones; read
// the new ones when they are there so an older response still works.
export const mapPaginationFromApi = (raw: any): ListPagination | null => {
  if (!raw) return null;
  const perPage = Number(raw.per_page ?? raw.limit ?? DEFAULT_PER_PAGE);
  const page = Number(raw.page ?? 1);
  const total = Number(raw.total ?? 0);
  return {
    total,
    page,
    perPage,
    from: Number(raw.from ?? (total === 0 ? 0 : (page - 1) * perPage + 1)),
    to: Number(raw.to ?? Math.min(total, page * perPage)),
    totalPages: Number(raw.total_pages ?? raw.totalPages ?? Math.max(1, Math.ceil(total / perPage))),
  };
};

export interface ListColumnChoice {
  key: string;
  label?: string;
  // The ⓘ copy for this column, served with the member's column choices so the
  // table header, the chooser and the record form all explain a field the same
  // way and a wording fix ships from the API alone.
  help?: string;
  visible: boolean;
  order: number;
}

export interface ListPreferences {
  listKey: string;
  columns: ListColumnChoice[];
  // The same help text as a flat map, for the record's own form, where there are
  // no columns to read it from.
  fieldHelp: Record<string, string>;
  // What this list calls one record and many, for the empty state and the
  // selection bar.
  nouns: { one: string; many: string };
  viewModes: string[];
  defaultViewMode: string;
  perPageOptions: number[];
  defaultPerPage: number;
}

export const mapColumnChoiceFromApi = (raw: any, index: number): ListColumnChoice => ({
  key: String(raw.key),
  label: raw.label ?? undefined,
  help: raw.help ?? undefined,
  visible: raw.visible !== false,
  order: Number.isFinite(raw.order) ? Number(raw.order) : index,
});

export const mapPreferencesFromApi = (raw: any): ListPreferences => ({
  listKey: String(raw.list_key),
  columns: (raw.columns ?? []).map(mapColumnChoiceFromApi),
  fieldHelp: raw.field_help ?? {},
  nouns: { one: raw.nouns?.one ?? "record", many: raw.nouns?.many ?? "records" },
  viewModes: raw.view_modes ?? [],
  defaultViewMode: raw.default_view_mode ?? "table",
  perPageOptions: raw.per_page_options ?? [...PER_PAGE_OPTIONS],
  defaultPerPage: Number(raw.default_per_page ?? DEFAULT_PER_PAGE),
});

// Only the keys and their order are stored; the labels come from the API.
export const columnsToApi = (columns: ListColumnChoice[]) =>
  columns.map((column, index) => ({ key: column.key, visible: column.visible, order: index }));

export type ListSortDir = "ASC" | "DESC";

export interface ListSort {
  sortBy?: string;
  sortDir: ListSortDir;
}

export type ListVisibility = "private" | "shared";

export interface SavedView {
  id: string;
  listKey: string;
  name: string;
  visibility: ListVisibility;
  // The list's own query values, exactly as the filter bar sends them.
  filters: Record<string, string>;
  sort: ListSort | null;
  columns: ListColumnChoice[] | null;
  viewMode: string | null;
  // Sent back on an edit so a view someone else saved meanwhile is refused
  // rather than overwritten.
  version: number;
  isMine: boolean;
  isDefault: boolean;
}

export const mapSavedViewFromApi = (raw: any): SavedView => ({
  id: String(raw.id),
  listKey: String(raw.list_key),
  name: raw.name,
  visibility: raw.visibility === "shared" ? "shared" : "private",
  filters: Object.fromEntries(
    Object.entries(raw.filters ?? {})
      .filter(([, value]) => value !== null && value !== undefined && value !== "")
      .map(([key, value]) => [key, String(value)]),
  ),
  sort: raw.sort ? { sortBy: raw.sort.sort_by ?? undefined, sortDir: raw.sort.sort_dir === "ASC" ? "ASC" : "DESC" } : null,
  columns: Array.isArray(raw.columns) && raw.columns.length ? raw.columns.map(mapColumnChoiceFromApi) : null,
  viewMode: raw.view_mode ?? null,
  version: Number(raw.version ?? 1),
  isMine: raw.is_mine !== false,
  isDefault: raw.is_default === true,
});

// ─── The empty state (SRS SH-L6) ─────────────────────────────────────────────

// Why a page came back empty, and what the screen should offer because of it.
// The API decides, so the three cases are told apart the same way on every list
// and the wording lives in one place. `reason` is null when there are rows.
export type ListEmptyReason = "no_records" | "no_matches" | "page_past_end";
export type ListEmptyAction = "create" | "clear_filters" | "first_page";

export interface ListEmptyState {
  reason: ListEmptyReason | null;
  title: string | null;
  message: string | null;
  action: ListEmptyAction | null;
  // Whether this member may create a record here, so the screen never offers a
  // create button the API would refuse.
  canCreate: boolean;
}

export const mapEmptyStateFromApi = (raw: any): ListEmptyState | null => {
  if (!raw) return null;
  return {
    reason: raw.reason ?? null,
    title: raw.title ?? null,
    message: raw.message ?? null,
    action: raw.action ?? null,
    canCreate: raw.can_create === true,
  };
};

// ─── Selection ───────────────────────────────────────────────────────────────

// Which records a bulk action or an export should act on. "All matching" is an
// explicit choice, never implied by ticking the header box: it reaches rows the
// member has not seen, so they have to ask for it.
export type ListSelection =
  | { mode: "none" }
  | { mode: "ids"; ids: string[] }
  | { mode: "all_matching"; count: number };

export const NO_SELECTION: ListSelection = { mode: "none" };

export const selectionCount = (selection: ListSelection): number => {
  if (selection.mode === "ids") return selection.ids.length;
  if (selection.mode === "all_matching") return selection.count;
  return 0;
};

// The body a bulk action sends. For "all matching" the server re-counts under a
// lock and refuses with COUNT_CHANGED if the number has moved since the member
// saw it, so the count they were shown goes along as `expected_count`.
export const bulkSelectionPayload = (
  selection: ListSelection,
  filters: Record<string, string | undefined>,
): Record<string, unknown> | null => {
  if (selection.mode === "ids" && selection.ids.length) return { ids: selection.ids };
  if (selection.mode === "all_matching") {
    return { scope: "all_matching", filters: cleanFilters(filters), expected_count: selection.count };
  }
  return null;
};

// Only filters that are set travel, so "everything matching" means the same
// thing on the server as the screen showed.
export const cleanFilters = (filters: Record<string, string | undefined>): Record<string, string> =>
  Object.fromEntries(
    Object.entries(filters).filter((entry): entry is [string, string] => typeof entry[1] === "string" && entry[1].trim() !== ""),
  );

// ─── Error codes the list contract answers with ──────────────────────────────

export const LIST_ERROR = {
  countChanged: "COUNT_CHANGED",
  selectionTooLarge: "SELECTION_TOO_LARGE",
  invalidPerPage: "INVALID_PER_PAGE",
  versionConflict: "VERSION_CONFLICT",
  viewNameTaken: "VIEW_NAME_TAKEN",
  notViewOwner: "NOT_VIEW_OWNER",
  exportTooLarge: "EXPORT_TOO_LARGE",
} as const;

export const errorCodeOf = (error: any): string | undefined => error?.response?.data?.code;

export const isCountChanged = (error: unknown) => errorCodeOf(error) === LIST_ERROR.countChanged;
