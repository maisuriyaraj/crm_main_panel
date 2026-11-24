"use client";

import * as React from "react";
import { ArrowDown, ArrowUp, ArrowUpDown, Inbox, Plus } from "lucide-react";

import { cn } from "@/lib/utils";
import {
  PER_PAGE_OPTIONS,
  selectionCount,
  type ListColumnChoice,
  type ListEmptyState,
  type ListPagination,
  type ListSelection,
  type ListSort,
  type PerPage,
} from "@/lib/lists/types";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Skeleton } from "@/components/ui/skeleton";
import { pageWindow } from "@/components/ui/data-table";
import { ColumnChooser } from "@/components/shared/column-chooser";
import { FieldHelp } from "@/components/shared/field-help";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";

// The one list surface for every module that lists records (SRS SH-L1 to SH-L7).
// Everything here is driven by the server: it shows the page the API returned,
// reports sort, page and page-size changes back, and never filters or sorts the
// rows it was given. The old DataTable stays for small client-side tables (team
// members, invitations); a list that pages on the server uses this.

export interface ServerListColumn<T> {
  // The API's own column key, so a saved column choice and a saved view mean the
  // same thing on both sides.
  key: string;
  header: React.ReactNode;
  // Plain text for the column chooser, when the header is not a plain string.
  label?: string;
  // The API sort field. A column with one is sortable; the rest are not, because
  // the server will not sort by them.
  sortBy?: string;
  help?: string;
  render: (row: T) => React.ReactNode;
  className?: string;
}

interface ServerListProps<T> {
  rows: T[];
  getRowId: (row: T) => string;
  // Shown before the chooseable columns and never offered in the chooser: the
  // selection checkbox belongs here.
  leading?: ServerListColumn<T>[];
  columns: ServerListColumn<T>[];
  // Shown last and never offered in the chooser: the row's own actions.
  trailing?: ServerListColumn<T>[];
  isLoading?: boolean;

  pagination: ListPagination | null;
  page: number;
  perPage: number;
  onPageChange: (page: number) => void;
  onPerPageChange: (perPage: PerPage) => void;

  sort: ListSort;
  // The component works out the next direction; the caller only hears which
  // field was clicked and in which direction it should now sort.
  onSortChange: (sortBy: string, sortDir: "ASC" | "DESC") => void;

  // The member's stored column choices. Left out, every column is shown and the
  // chooser is hidden.
  columnChoices?: ListColumnChoice[];
  columnLabels?: Record<string, string>;
  onColumnsChange?: (columns: ListColumnChoice[]) => void;
  onColumnsReset?: () => void;

  selection?: ListSelection;
  onSelectionChange?: (selection: ListSelection) => void;
  // The ⓘ copy the API served with the member's column choices. It wins over a
  // column's own `help`, so the wording lives on the server.
  columnHelp?: Record<string, string>;

  // The empty state. The API says which of the three cases this is, what to say
  // and which action to offer; the screen only supplies the handlers. Without it
  // (an older API, or a list not on the contract) the same cases are worked out
  // from `hasFilters` and `hasAnyWithoutFilters` instead.
  emptyState?: ListEmptyState | null;
  noun: string;
  nounPlural: string;
  hasFilters: boolean;
  hasAnyWithoutFilters: boolean;
  onClearFilters?: () => void;
  createAction?: { label: string; onClick: () => void };

  toolbarStart?: React.ReactNode;
  toolbarEnd?: React.ReactNode;
  onRowClick?: (row: T) => void;
}

const nextDirection = (sort: ListSort, sortBy: string): "ASC" | "DESC" =>
  (sort.sortBy === sortBy && sort.sortDir === "ASC" ? "DESC" : "ASC");

export function ServerList<T>({
  rows,
  getRowId,
  leading = [],
  columns,
  trailing = [],
  isLoading = false,
  pagination,
  page,
  perPage,
  onPageChange,
  onPerPageChange,
  sort,
  onSortChange,
  columnChoices,
  columnLabels = {},
  onColumnsChange,
  onColumnsReset,
  selection,
  onSelectionChange,
  columnHelp = {},
  emptyState,
  noun,
  nounPlural,
  hasFilters,
  hasAnyWithoutFilters,
  onClearFilters,
  createAction,
  toolbarStart,
  toolbarEnd,
  onRowClick,
}: ServerListProps<T>) {
  const total = pagination?.total ?? rows.length;
  const totalPages = pagination?.totalPages ?? 1;
  const from = pagination?.from ?? (rows.length ? (page - 1) * perPage + 1 : 0);
  const to = pagination?.to ?? (page - 1) * perPage + rows.length;

  const labels: Record<string, string> = {
    ...Object.fromEntries(columns.map((column) => [column.key, column.label ?? (typeof column.header === "string" ? column.header : column.key)])),
    ...columnLabels,
  };

  // The chooser decides which of the chooseable columns are shown, and in what
  // order. Without stored choices every column is shown as declared.
  const ordered = React.useMemo(() => {
    if (!columnChoices || columnChoices.length === 0) return columns;
    const byKey = new Map(columns.map((column) => [column.key, column]));
    const chosen = columnChoices
      .filter((choice) => choice.visible && byKey.has(choice.key))
      .map((choice) => byKey.get(choice.key)!);
    // A column this screen declares but the stored choice has never seen (a new
    // column shipped since) stays visible rather than vanishing.
    const seen = new Set(columnChoices.map((choice) => choice.key));
    return [...chosen, ...columns.filter((column) => !seen.has(column.key))];
  }, [columns, columnChoices]);

  const rendered = [...leading, ...ordered, ...trailing];

  const pageIds = rows.map(getRowId);
  const selected = selection ?? { mode: "none" as const };
  const chosenCount = selectionCount(selected);
  const allMatching = selected.mode === "all_matching";
  const selectedIds = selected.mode === "ids" ? new Set(selected.ids) : new Set<string>();
  const pageFullySelected = pageIds.length > 0 && (allMatching || pageIds.every((id) => selectedIds.has(id)));

  const setSelection = (next: ListSelection) => onSelectionChange?.(next);

  const togglePage = (checked: boolean) => {
    if (!checked) {
      setSelection({ mode: "none" });
      return;
    }
    setSelection({ mode: "ids", ids: pageIds });
  };

  const toggleRow = (id: string, checked: boolean) => {
    // Ticking one row out of "all matching" drops back to a plain id selection:
    // the member is now picking rows by hand again.
    const base = allMatching ? new Set(pageIds) : new Set(selectedIds);
    if (checked) base.add(id);
    else base.delete(id);
    setSelection(base.size ? { mode: "ids", ids: [...base] } : { mode: "none" });
  };

  // "Select all N matching" reaches rows the member cannot see on this page, so
  // it is only offered when there are such rows, or when a filter defines what
  // "matching" even means.
  const canSelectAllMatching = !!onSelectionChange && !allMatching && (total > rows.length || hasFilters);

  const headerCell = (column: ServerListColumn<T>) => (
    <TableHead key={column.key} className={column.className}>
      <span className="inline-flex items-center gap-1">
        {column.sortBy ? (
          <button
            type="button"
            onClick={() => onSortChange(column.sortBy!, nextDirection(sort, column.sortBy!))}
            className="flex items-center gap-1 font-medium hover:text-foreground"
            aria-label={`Sort by ${labels[column.key] ?? column.key}`}
          >
            {column.header}
            {sort.sortBy === column.sortBy ? (
              sort.sortDir === "ASC" ? <ArrowUp className="h-3.5 w-3.5" /> : <ArrowDown className="h-3.5 w-3.5" />
            ) : (
              <ArrowUpDown className="h-3.5 w-3.5 opacity-40" />
            )}
          </button>
        ) : (
          column.header
        )}
        <FieldHelp text={columnHelp[column.key] ?? column.help} />
      </span>
    </TableHead>
  );

  return (
    <div className="space-y-3">
      {(toolbarStart || toolbarEnd || (columnChoices && onColumnsChange)) && (
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex flex-wrap items-center gap-2">{toolbarStart}</div>
          <div className="flex flex-wrap items-center gap-2">
            {toolbarEnd}
            {columnChoices && onColumnsChange && (
              <ColumnChooser
                columns={columnChoices}
                renderable={columns.map((column) => column.key)}
                labels={labels}
                onChange={onColumnsChange}
                onReset={onColumnsReset}
              />
            )}
          </div>
        </div>
      )}

      {onSelectionChange && (chosenCount > 0 || allMatching) && (
        <div className="flex flex-wrap items-center gap-2 rounded-md border border-border bg-muted/40 px-3 py-2 text-sm">
          <span className="font-medium">
            {allMatching
              ? `All ${total.toLocaleString("en-IN")} matching ${nounPlural} selected`
              : `${chosenCount} ${chosenCount === 1 ? noun : nounPlural} selected on this page`}
          </span>

          {/* The two choices stand side by side and are never implied: ticking
              the header box takes this page, and reaching rows the member has
              not seen is a separate, named button. */}
          {!allMatching && !pageFullySelected && (
            <Button type="button" variant="outline" size="sm" onClick={() => setSelection({ mode: "ids", ids: pageIds })}>
              Select this page ({rows.length})
            </Button>
          )}

          {canSelectAllMatching && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setSelection({ mode: "all_matching", count: total })}
            >
              Select all {total.toLocaleString("en-IN")} matching
            </Button>
          )}

          <Button type="button" variant="ghost" size="sm" onClick={() => setSelection({ mode: "none" })}>
            Clear selection
          </Button>
        </div>
      )}

      <div className="rounded-lg border border-border">
        <Table>
          <TableHeader>
            <TableRow>
              {leading.map((column) =>
                column.key === "select" && onSelectionChange ? (
                  <TableHead key="select" className={cn("w-10", column.className)}>
                    <Checkbox
                      checked={pageFullySelected}
                      onCheckedChange={(checked) => togglePage(checked === true)}
                      aria-label={`Select the ${rows.length} ${nounPlural} on this page`}
                      title={`Selects the ${rows.length} ${nounPlural} on this page`}
                    />
                  </TableHead>
                ) : (
                  headerCell(column)
                ),
              )}
              {ordered.map(headerCell)}
              {trailing.map(headerCell)}
            </TableRow>
          </TableHeader>

          <TableBody>
            {isLoading && rows.length === 0 ? (
              Array.from({ length: Math.min(perPage, 10) }, (_, index) => (
                <TableRow key={`skeleton-${index}`}>
                  {rendered.map((column) => (
                    <TableCell key={column.key} className={column.className}>
                      <Skeleton className="h-4 w-full max-w-40" />
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : rows.length === 0 ? (
              <TableRow>
                <TableCell colSpan={rendered.length} className="py-12 text-center">
                  <Inbox className="mx-auto mb-3 h-8 w-8 text-muted-foreground" />
                  {/* Three different empty states, because they need three
                      different actions: nothing exists yet (create one), the
                      filters hide everything (clear them), or this page simply
                      ran past the end (go back a page). The API says which, and
                      supplies the words; the branch below is the fallback. */}
                  {emptyState?.reason ? (
                    <>
                      <p className="text-sm">{emptyState.title}</p>
                      {emptyState.message && (
                        <p className="mt-1 text-xs text-muted-foreground">{emptyState.message}</p>
                      )}
                      {emptyState.action === "create" && createAction && emptyState.canCreate && (
                        <Button type="button" className="mt-3" onClick={createAction.onClick}>
                          <Plus className="h-4 w-4" />
                          {createAction.label}
                        </Button>
                      )}
                      {emptyState.action === "clear_filters" && onClearFilters && (
                        <Button type="button" variant="outline" size="sm" className="mt-3" onClick={onClearFilters}>
                          Clear filters
                        </Button>
                      )}
                      {emptyState.action === "first_page" && (
                        <Button type="button" variant="outline" size="sm" className="mt-3" onClick={() => onPageChange(1)}>
                          Back to the first page
                        </Button>
                      )}
                    </>
                  ) : !hasAnyWithoutFilters ? (
                    <>
                      <p className="text-sm">No {nounPlural} found.</p>
                      <p className="mt-1 text-xs text-muted-foreground">
                        Nothing here yet. Add your first {noun} to get started.
                      </p>
                      {createAction && (
                        <Button type="button" className="mt-3" onClick={createAction.onClick}>
                          <Plus className="h-4 w-4" />
                          {createAction.label}
                        </Button>
                      )}
                    </>
                  ) : hasFilters ? (
                    <>
                      <p className="text-sm">No {nounPlural} match these filters.</p>
                      {onClearFilters && (
                        <Button type="button" variant="outline" size="sm" className="mt-3" onClick={onClearFilters}>
                          Clear filters
                        </Button>
                      )}
                    </>
                  ) : (
                    <>
                      <p className="text-sm">No {nounPlural} on this page.</p>
                      {page > 1 && (
                        <Button type="button" variant="outline" size="sm" className="mt-3" onClick={() => onPageChange(1)}>
                          Back to the first page
                        </Button>
                      )}
                    </>
                  )}
                </TableCell>
              </TableRow>
            ) : (
              rows.map((row) => {
                const id = getRowId(row);
                return (
                  <TableRow
                    key={id}
                    className={onRowClick ? "cursor-pointer" : undefined}
                    onClick={onRowClick ? () => onRowClick(row) : undefined}
                  >
                    {leading.map((column) =>
                      column.key === "select" && onSelectionChange ? (
                        <TableCell key="select" onClick={(event) => event.stopPropagation()}>
                          <Checkbox
                            checked={allMatching || selectedIds.has(id)}
                            onCheckedChange={(checked) => toggleRow(id, checked === true)}
                            aria-label="Select this row"
                          />
                        </TableCell>
                      ) : (
                        <TableCell key={column.key} className={column.className}>
                          {column.render(row)}
                        </TableCell>
                      ),
                    )}
                    {ordered.map((column) => (
                      <TableCell key={column.key} className={column.className}>
                        {column.render(row)}
                      </TableCell>
                    ))}
                    {trailing.map((column) => (
                      <TableCell key={column.key} className={column.className} onClick={(event) => event.stopPropagation()}>
                        {column.render(row)}
                      </TableCell>
                    ))}
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <span>
            {total === 0
              ? `0 ${nounPlural}`
              : `${from.toLocaleString("en-IN")}–${to.toLocaleString("en-IN")} of ${total.toLocaleString("en-IN")} items`}
          </span>

          <Select
            value={String(perPage)}
            onValueChange={(value) => onPerPageChange(Number(value) as PerPage)}
          >
            <SelectTrigger className="h-8 w-28" aria-label="Records per page">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {PER_PAGE_OPTIONS.map((option) => (
                <SelectItem key={option} value={String(option)}>
                  {option} / page
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {totalPages > 1 && (
          <Pagination className="mx-0 w-auto justify-end">
            <PaginationContent className="flex-wrap justify-end">
              <PaginationItem>
                <PaginationPrevious
                  href="#"
                  onClick={(event) => {
                    event.preventDefault();
                    if (page > 1) onPageChange(page - 1);
                  }}
                  className={page === 1 ? "pointer-events-none opacity-50" : ""}
                />
              </PaginationItem>

              {pageWindow(page, totalPages).map((pageNumber, index) =>
                pageNumber === "gap" ? (
                  <PaginationItem key={`gap-${index}`}>
                    <PaginationEllipsis />
                  </PaginationItem>
                ) : (
                  <PaginationItem key={pageNumber}>
                    <PaginationLink
                      href="#"
                      isActive={pageNumber === page}
                      onClick={(event) => {
                        event.preventDefault();
                        onPageChange(pageNumber);
                      }}
                    >
                      {pageNumber}
                    </PaginationLink>
                  </PaginationItem>
                ),
              )}

              <PaginationItem>
                <PaginationNext
                  href="#"
                  onClick={(event) => {
                    event.preventDefault();
                    if (page < totalPages) onPageChange(page + 1);
                  }}
                  className={page === totalPages ? "pointer-events-none opacity-50" : ""}
                />
              </PaginationItem>
            </PaginationContent>
          </Pagination>
        )}
      </div>
    </div>
  );
}
