"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { useAppDispatch, useAppSelector } from "@/lib/store/hooks";
import {
  columnsChangedLocally,
  listSlotOf,
  reqToGetListPreferences,
  reqToGetSavedViews,
  reqToSaveListPreferences,
} from "@/lib/store/slices/listViewsSlice";
import {
  bulkSelectionPayload,
  cleanFilters,
  DEFAULT_PER_PAGE,
  NO_SELECTION,
  type ListColumnChoice,
  type ListSelection,
  type ListSort,
  type PerPage,
  type SavedView,
} from "@/lib/lists/types";

// Everything a server-driven list screen needs besides its own filters: the
// page, the page size, the sort, the member's column choices, their saved views
// and the selection a bulk action or export will act on.
//
// Filters stay with the screen, because only the screen knows what its filter
// bar looks like. It hands them in, and gets back the query to send and the
// payload a bulk action needs; applying a saved view calls back so the screen
// can put the view's filters into its own controls.

// A stable empty map, so a screen reading the help before the preferences load
// does not see a new object on every render.
const EMPTY_HELP: Record<string, string> = {};

interface UseServerListOptions {
  listKey: string;
  // The current filter values, already in the API's own query names.
  filters: Record<string, string | undefined>;
  // Whether any filter is set, which decides the empty state's wording and
  // whether "select all matching" is worth offering.
  hasFilters: boolean;
  // Put a saved view's filters into the screen's controls. Called with an empty
  // object when the member picks "All records".
  onApplyFilters: (filters: Record<string, string>) => void;
  // For a list with more than one layout (the Leads board), so a saved view can
  // carry the layout too.
  onApplyViewMode?: (viewMode: string) => void;
  // Left off while the member cannot see the list at all.
  enabled?: boolean;
  defaultSort?: ListSort;
}

export function useServerList({
  listKey,
  filters,
  hasFilters,
  onApplyFilters,
  onApplyViewMode,
  enabled = true,
  defaultSort = { sortBy: undefined, sortDir: "DESC" },
}: UseServerListOptions) {
  const dispatch = useAppDispatch();
  const slot = useAppSelector((state) => listSlotOf(state.listViews as any, listKey));

  const [page, setPageState] = useState(1);
  const [perPage, setPerPageState] = useState<PerPage>(DEFAULT_PER_PAGE);
  const [sort, setSortState] = useState<ListSort>(defaultSort);
  const [selection, setSelection] = useState<ListSelection>(NO_SELECTION);
  const [activeViewId, setActiveViewId] = useState<string | null>(null);

  useEffect(() => {
    if (!enabled) return;
    dispatch(reqToGetListPreferences({ data: { listKey } }));
    dispatch(reqToGetSavedViews({ data: { listKey } }));
  }, [dispatch, listKey, enabled]);

  const columns = slot.preferences?.columns ?? [];

  // A selection is only ever about rows the member can currently see described
  // by the filters, so changing what is on screen drops it.
  const clearSelection = useCallback(() => setSelection(NO_SELECTION), []);

  const setPage = useCallback((next: number) => {
    setPageState(next);
    setSelection(NO_SELECTION);
  }, []);

  const setPerPage = useCallback((next: PerPage) => {
    setPerPageState(next);
    setPageState(1);
    setSelection(NO_SELECTION);
  }, []);

  const setSort = useCallback((sortBy: string, sortDir: "ASC" | "DESC") => {
    setSortState({ sortBy, sortDir });
    setPageState(1);
  }, []);

  // Back to page one, for the screen to call whenever a filter changes.
  const resetPaging = useCallback(() => {
    setPageState(1);
    setSelection(NO_SELECTION);
  }, []);

  const applyView = useCallback(
    (view: SavedView | null) => {
      setActiveViewId(view ? view.id : null);
      setSelection(NO_SELECTION);
      setPageState(1);
      onApplyFilters(view ? view.filters : {});
      if (view?.sort) setSortState({ sortBy: view.sort.sortBy, sortDir: view.sort.sortDir });
      else setSortState(defaultSort);
      if (view?.columns?.length) dispatch(columnsChangedLocally({ listKey, columns: view.columns }));
      if (view?.viewMode && onApplyViewMode) onApplyViewMode(view.viewMode);
    },
    // `defaultSort` is a literal from the screen, so it is left out on purpose:
    // including it would rebuild this on every render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [dispatch, listKey, onApplyFilters, onApplyViewMode],
  );

  // The member's default view opens the list, once per mount and only while they
  // have not already chosen something themselves.
  const defaultApplied = useRef(false);
  useEffect(() => {
    if (!enabled || defaultApplied.current || !slot.defaultViewId || slot.views.length === 0) return;
    const view = slot.views.find((candidate) => candidate.id === slot.defaultViewId);
    if (!view) return;
    defaultApplied.current = true;
    applyView(view);
  }, [enabled, slot.defaultViewId, slot.views, applyView]);

  const saveColumns = useCallback(
    (next: ListColumnChoice[]) => {
      // Shown straight away; the request only persists it.
      dispatch(columnsChangedLocally({ listKey, columns: next }));
      dispatch(reqToSaveListPreferences({ data: { listKey, columns: next } }));
    },
    [dispatch, listKey],
  );

  // Back to the columns the product ships with: an empty list tells the API the
  // member no longer arranges this list by hand.
  const resetColumns = useCallback(() => {
    dispatch(reqToSaveListPreferences({ data: { listKey, columns: [] } }));
  }, [dispatch, listKey]);

  const cleanedFilters = useMemo(() => cleanFilters(filters), [filters]);

  const query = useMemo(
    () => ({
      ...cleanedFilters,
      page,
      per_page: perPage,
      ...(sort.sortBy ? { sort_by: sort.sortBy, sort_dir: sort.sortDir } : {}),
    }),
    [cleanedFilters, page, perPage, sort],
  );

  // The ids ticked, or "everything matching these filters" with the count the
  // member was shown. Null when nothing is selected.
  const bulkPayload = useCallback(
    (extra?: Record<string, unknown>) => {
      const base = bulkSelectionPayload(selection, filters);
      if (!base) return null;
      return extra ? { ...base, ...extra } : base;
    },
    [selection, filters],
  );

  return {
    page,
    perPage,
    sort,
    setPage,
    setPerPage,
    setSort,
    resetPaging,
    query,
    filters: cleanedFilters,
    hasFilters,

    columns,
    saveColumns,
    resetColumns,
    preferences: slot.preferences,
    // The ⓘ copy the API serves with the columns, for the table header and for
    // the record's own form.
    fieldHelp: slot.preferences?.fieldHelp ?? EMPTY_HELP,
    nouns: slot.preferences?.nouns ?? null,

    views: slot.views,
    defaultViewId: slot.defaultViewId,
    activeViewId,
    applyView,

    selection,
    setSelection,
    clearSelection,
    bulkPayload,
  };
}
