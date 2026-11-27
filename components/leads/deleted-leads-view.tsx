"use client";

import { useCallback, useEffect, useState } from "react";
import { RotateCcw } from "lucide-react";

import { Axios } from "@/lib/axios";
import { apiRoutes } from "@/lib/constants";
import { notify } from "@/lib/commonFunctions";
import { apiErrorCode, apiErrorMessage } from "@/lib/auth/errors";
import { useAppDispatch } from "@/lib/store/hooks";
import { reqToRestoreLead } from "@/lib/store/slices/leadsSlice";
import { mapLeadFromApi } from "@/lib/leads/mappers";
import { hasNoName, leadDisplayName, type Lead } from "@/lib/leads/types";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

// LD-A3: the leads this organization has deleted, and how long is left to bring
// each one back. Nothing is ever destroyed — past its deadline a lead simply
// stops being restorable, and the row says so instead of offering a button that
// would be refused.
//
// This reads the same lead list the main screen does, asked the other way
// round, so a member only ever sees leads their role would have let them see
// while they were live.

const PER_PAGE = 25;

const formatDeadline = (iso?: string) => {
  if (!iso) return "Unknown";
  return new Date(iso).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
};

// Whole days left, rounded down, so "1 day left" never means a few minutes.
const daysLeft = (iso?: string): number | null => {
  if (!iso) return null;
  const remaining = new Date(iso).getTime() - Date.now();
  return remaining <= 0 ? 0 : Math.floor(remaining / (24 * 60 * 60 * 1000));
};

interface DeletedLeadsViewProps {
  // The board being shown. The deleted list is per pipeline, like the live one.
  pipelineId: string | null;
  // Called after a lead comes back, so the live list and the usage figures
  // catch up with it.
  onRestored: () => void;
}

export function DeletedLeadsView({ pipelineId, onRestored }: DeletedLeadsViewProps) {
  const dispatch = useAppDispatch();
  const [rows, setRows] = useState<Lead[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [restoringId, setRestoringId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const response = await Axios.get(apiRoutes.leads, {
        params: {
          include_deleted: true,
          status: "deleted",
          page,
          per_page: PER_PAGE,
          ...(pipelineId ? { pipeline_id: pipelineId } : {}),
        },
      });
      setRows((response.data?.data ?? []).map(mapLeadFromApi));
      setTotal(response.data?.pagination?.total ?? 0);
    } catch (error) {
      setRows([]);
      setTotal(0);
      setLoadError(apiErrorMessage(error, "Couldn't load deleted leads."));
    } finally {
      setLoading(false);
    }
  }, [page, pipelineId]);

  useEffect(() => {
    load();
  }, [load]);

  const restore = (lead: Lead) => {
    setRestoringId(lead.id);
    dispatch(
      reqToRestoreLead({
        data: { id: lead.id },
        onSuccess: () => {
          setRestoringId(null);
          notify(`${leadDisplayName(lead)} is back in your pipeline.`, { type: "success" });
          load();
          onRestored();
        },
        onFailure: (error: unknown) => {
          setRestoringId(null);
          // The deadline passed while this list was open, or the plan is full:
          // either way the row has to be re-read before it means anything.
          if (apiErrorCode(error) === "RESTORE_PERIOD_OVER") load();
          notify(apiErrorMessage(error, "Couldn't restore this lead. Please try again."), { type: "error" });
        },
      }),
    );
  };

  const lastPage = Math.max(Math.ceil(total / PER_PAGE), 1);

  if (loadError) {
    return (
      <Alert variant="destructive">
        <AlertTitle>Couldn&apos;t load deleted leads</AlertTitle>
        <AlertDescription>{loadError}</AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="space-y-3">
      <Alert>
        <AlertTitle>Deleted leads stay here for 30 days</AlertTitle>
        <AlertDescription>
          Restoring puts a lead back on this board with everything it had. After 30 days it can no longer be restored.
        </AlertDescription>
      </Alert>

      <div className="rounded-md border border-border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Company</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Mobile</TableHead>
              <TableHead>Restore until</TableHead>
              <TableHead className="text-right">&nbsp;</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading &&
              Array.from({ length: 3 }).map((_, index) => (
                <TableRow key={`skeleton-${index}`}>
                  <TableCell colSpan={6}>
                    <Skeleton className="h-5 w-full" />
                  </TableCell>
                </TableRow>
              ))}

            {!loading && rows.length === 0 && (
              <TableRow>
                <TableCell colSpan={6} className="py-8 text-center text-sm text-muted-foreground">
                  Nothing has been deleted from this board.
                </TableCell>
              </TableRow>
            )}

            {!loading &&
              rows.map((lead) => {
                const left = daysLeft(lead.restoreDeadline);
                const expired = lead.canRestore === false;
                return (
                  <TableRow key={lead.id}>
                    <TableCell className={cn("font-medium", hasNoName(lead) && "font-normal text-muted-foreground")}>
                      {leadDisplayName(lead)}
                    </TableCell>
                    <TableCell>{lead.companyName ?? "—"}</TableCell>
                    <TableCell>{lead.email ?? "—"}</TableCell>
                    <TableCell>{lead.mobile ?? "—"}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <span>{formatDeadline(lead.restoreDeadline)}</span>
                        {expired ? (
                          <Badge variant="outline" className="text-xs">Window closed</Badge>
                        ) : (
                          <Badge variant="secondary" className="text-xs">
                            {left === 0 ? "Last day" : `${left} day${left === 1 ? "" : "s"} left`}
                          </Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      {expired ? (
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              {/* A disabled button takes no pointer events, so
                                  the span carries the explanation. */}
                              <span tabIndex={0} className="inline-flex">
                                <Button size="sm" variant="outline" disabled>
                                  <RotateCcw className="h-3.5 w-3.5" /> Restore
                                </Button>
                              </span>
                            </TooltipTrigger>
                            <TooltipContent className="max-w-xs">
                              This lead was deleted more than 30 days ago, so it can no longer be restored. Its details
                              are kept, but only OrbitOps support can reach them now.
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      ) : (
                        <Button
                          size="sm"
                          variant="outline"
                          disabled={restoringId === lead.id}
                          onClick={() => restore(lead)}
                        >
                          <RotateCcw className="h-3.5 w-3.5" /> Restore
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })}
          </TableBody>
        </Table>
      </div>

      {total > PER_PAGE && (
        <div className="flex items-center justify-between text-sm text-muted-foreground">
          <span>
            Page {page} of {lastPage} · {total.toLocaleString("en-IN")} deleted lead(s)
          </span>
          <div className="flex gap-2">
            <Button size="sm" variant="outline" disabled={page <= 1} onClick={() => setPage(page - 1)}>
              Previous
            </Button>
            <Button size="sm" variant="outline" disabled={page >= lastPage} onClick={() => setPage(page + 1)}>
              Next
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
