"use client";

import * as React from "react";
import { ArrowDown, ArrowUp, ArrowUpDown, Search } from "lucide-react";

import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
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
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";

export interface DataTableColumn<T> {
  key: string;
  header: React.ReactNode;
  sortable?: boolean;
  render?: (row: T) => React.ReactNode;
  accessor?: (row: T) => string | number | null | undefined;
  // Applied to both the header and body cells, e.g. "hidden md:table-cell".
  className?: string;
}

export type SortDirection = "asc" | "desc";

// Server-driven mode: `data` is already the current page, and search, sort and
// paging are reported to the caller instead of being applied locally.
export interface DataTableManualState {
  total: number;
  page: number;
  onPageChange: (page: number) => void;
  sortKey?: string | null;
  sortDir?: SortDirection;
  onSortChange?: (key: string, dir: SortDirection) => void;
  search?: string;
  onSearchChange?: (value: string) => void;
}

interface DataTableProps<T> {
  columns: DataTableColumn<T>[];
  data: T[];
  getRowId: (row: T) => string;
  searchPlaceholder?: string;
  searchKeys?: (keyof T)[];
  pageSize?: number;
  emptyMessage?: string;
  // Replaces emptyMessage when the empty state needs actions or icons.
  emptyState?: React.ReactNode;
  isLoading?: boolean;
  manual?: DataTableManualState;
}

export function DataTable<T>({
  columns,
  data,
  getRowId,
  searchPlaceholder = "Search...",
  searchKeys = [],
  pageSize = 10,
  emptyMessage = "No results found.",
  emptyState,
  isLoading = false,
  manual,
}: DataTableProps<T>) {
  const [localSearch, setLocalSearch] = React.useState("");
  const [localSortKey, setLocalSortKey] = React.useState<string | null>(null);
  const [localSortDir, setLocalSortDir] = React.useState<SortDirection>("asc");
  const [localPage, setLocalPage] = React.useState(1);

  const search = manual ? manual.search ?? "" : localSearch;
  const sortKey = manual ? manual.sortKey ?? null : localSortKey;
  const sortDir = manual ? manual.sortDir ?? "asc" : localSortDir;
  const showSearch = manual ? !!manual.onSearchChange : searchKeys.length > 0;

  const filtered = React.useMemo(() => {
    if (manual || !search.trim() || searchKeys.length === 0) return data;

    const term = search.trim().toLowerCase();
    return data.filter((row) =>
      searchKeys.some((key) => String(row[key] ?? "").toLowerCase().includes(term)),
    );
  }, [data, search, searchKeys, manual]);

  const sorted = React.useMemo(() => {
    if (manual || !sortKey) return filtered;

    const column = columns.find((c) => c.key === sortKey);
    const getValue = column?.accessor ?? ((row: T) => (row as Record<string, unknown>)[sortKey] as string | number);

    return [...filtered].sort((a, b) => {
      const aValue = getValue(a);
      const bValue = getValue(b);

      if (aValue == null && bValue == null) return 0;
      if (aValue == null) return sortDir === "asc" ? -1 : 1;
      if (bValue == null) return sortDir === "asc" ? 1 : -1;

      if (typeof aValue === "number" && typeof bValue === "number") {
        return sortDir === "asc" ? aValue - bValue : bValue - aValue;
      }

      const comparison = String(aValue).localeCompare(String(bValue));
      return sortDir === "asc" ? comparison : -comparison;
    });
  }, [filtered, sortKey, sortDir, columns, manual]);

  const totalRows = manual ? manual.total : sorted.length;
  const totalPages = Math.max(1, Math.ceil(totalRows / pageSize));
  const currentPage = Math.min(manual ? manual.page : localPage, totalPages);
  const paged = manual ? data : sorted.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  const setPage = (next: number) => {
    const clamped = Math.min(Math.max(1, next), totalPages);
    if (manual) manual.onPageChange(clamped);
    else setLocalPage(clamped);
  };

  const toggleSort = (key: string) => {
    const nextDir: SortDirection = sortKey !== key ? "asc" : sortDir === "asc" ? "desc" : "asc";
    if (manual) {
      manual.onSortChange?.(key, nextDir);
      return;
    }
    setLocalSortKey(key);
    setLocalSortDir(nextDir);
  };

  const onSearch = (value: string) => {
    if (manual) {
      manual.onSearchChange?.(value);
      return;
    }
    setLocalSearch(value);
    setLocalPage(1);
  };

  return (
    <div className="space-y-4">
      {showSearch && (
        <div className="relative max-w-sm">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            value={search}
            onChange={(event) => onSearch(event.target.value)}
            placeholder={searchPlaceholder}
            className="pl-9"
          />
        </div>
      )}

      <div className="rounded-lg border border-border">
        <Table>
          <TableHeader>
            <TableRow>
              {columns.map((column) => (
                <TableHead key={column.key} className={column.className}>
                  {column.sortable ? (
                    <button
                      type="button"
                      onClick={() => toggleSort(column.key)}
                      className={cn(
                        "flex items-center gap-1 font-medium hover:text-foreground",
                      )}
                    >
                      {column.header}
                      {sortKey === column.key ? (
                        sortDir === "asc" ? (
                          <ArrowUp className="h-3.5 w-3.5" />
                        ) : (
                          <ArrowDown className="h-3.5 w-3.5" />
                        )
                      ) : (
                        <ArrowUpDown className="h-3.5 w-3.5 opacity-40" />
                      )}
                    </button>
                  ) : (
                    column.header
                  )}
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>

          <TableBody>
            {isLoading ? (
              Array.from({ length: pageSize }, (_, i) => (
                <TableRow key={`skeleton-${i}`}>
                  {columns.map((column) => (
                    <TableCell key={column.key} className={column.className}>
                      <Skeleton className="h-4 w-full max-w-40" />
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : paged.length === 0 ? (
              <TableRow>
                <TableCell colSpan={columns.length} className="h-24 text-center text-muted-foreground">
                  {emptyState ?? emptyMessage}
                </TableCell>
              </TableRow>
            ) : (
              paged.map((row) => (
                <TableRow key={getRowId(row)}>
                  {columns.map((column) => (
                    <TableCell key={column.key} className={column.className}>
                      {column.render
                        ? column.render(row)
                        : String((row as Record<string, unknown>)[column.key] ?? "")}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {totalPages > 1 && (
        <Pagination>
          <PaginationContent>
            <PaginationItem>
              <PaginationPrevious
                href="#"
                onClick={(event) => {
                  event.preventDefault();
                  setPage(currentPage - 1);
                }}
                className={currentPage === 1 ? "pointer-events-none opacity-50" : ""}
              />
            </PaginationItem>

            {Array.from({ length: totalPages }, (_, i) => i + 1).map((pageNumber) => (
              <PaginationItem key={pageNumber}>
                <PaginationLink
                  href="#"
                  isActive={pageNumber === currentPage}
                  onClick={(event) => {
                    event.preventDefault();
                    setPage(pageNumber);
                  }}
                >
                  {pageNumber}
                </PaginationLink>
              </PaginationItem>
            ))}

            <PaginationItem>
              <PaginationNext
                href="#"
                onClick={(event) => {
                  event.preventDefault();
                  setPage(currentPage + 1);
                }}
                className={currentPage === totalPages ? "pointer-events-none opacity-50" : ""}
              />
            </PaginationItem>
          </PaginationContent>
        </Pagination>
      )}
    </div>
  );
}
