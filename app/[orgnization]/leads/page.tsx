"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Plus } from "lucide-react";

import { notify } from "@/lib/commonFunctions";
import { useAppDispatch, useAppSelector } from "@/lib/store/hooks";
import { useAuth } from "@/hooks/useAuth";
import { useCreateFromUrl } from "@/hooks/useCreateFromUrl";
import { useServerList } from "@/hooks/useServerList";
import {
  reqToAddLeadActivity,
  reqToBulkDeleteLeads,
  reqToBulkUpdateLeads,
  reqToChangeLeadStage,
  reqToCreateLead,
  reqToCreateLeadNote,
  reqToDeleteLead,
  reqToDeleteLeadNote,
  reqToGetLeadActivities,
  reqToGetLeadNotes,
  reqToGetLeadStatuses,
  reqToGetLeads,
  reqToGetPipelines,
  reqToUpdateLead,
  reqToUpdateLeadNote,
} from "@/lib/store/slices/leadsSlice";
import { reqToGetMemberOptions } from "@/lib/store/slices/orgUsersSlice";
import { isFeatureOn, reqToGetFeatures } from "@/lib/store/slices/featuresSlice";
import { reqToConvertLead } from "@/lib/store/slices/contactsSlice";
import { mapLeadPayloadToApi } from "@/lib/leads/mappers";
import {
  OUTCOME_LABEL,
  resolveOwnerName,
  stageOutcome,
  type Lead,
  type LeadActivityType,
  type LeadStage,
} from "@/lib/leads/types";
import { readLastPipeline, writeLastPipeline } from "@/lib/leads/last-pipeline";
import { isCountChanged, selectionCount } from "@/lib/lists/types";
import { helpFor } from "@/lib/lists/help-text";
import { exportSelectionParams } from "@/lib/exports";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { LeadFormDialog, type LeadFormValues } from "@/components/leads/lead-form-dialog";
import { KanbanBoard } from "@/components/leads/kanban-board";
import { PipelineSelector } from "@/components/leads/pipeline-selector";
import { PipelineSettingsDialog } from "@/components/leads/pipeline-settings-dialog";
import { StageReasonDialog, type StageReasonRequest } from "@/components/leads/stage-reason-dialog";
import { LeadDetailSheet } from "@/components/leads/lead-detail-sheet";
import { LeadAnalytics } from "@/components/leads/lead-analytics";
import { NoAccess } from "@/components/auth/no-access";
import { apiErrorCode, apiErrorMessage } from "@/lib/auth/errors";
import { ExportButton } from "@/components/shared/export-button";
import { ServerList, type ServerListColumn } from "@/components/shared/server-list";
import { SavedViewsBar } from "@/components/shared/saved-views-bar";
import { Truncated } from "@/components/shared/field-help";
import { apiRoutes } from "@/lib/constants";
import { HeldLeadsNotice } from "@/components/usage/held-leads-notice";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { useUsage } from "@/hooks/useUsage";
import { formatCount, leadsFull, limitRefusalFrom } from "@/lib/usage/mappers";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

type ViewMode = "list" | "kanban" | "analytics";

const LIST_KEY = "leads";

const PRIORITY_VARIANT: Record<Lead["priority"], "default" | "secondary" | "outline" | "destructive"> = {
  low: "outline",
  medium: "secondary",
  high: "default",
  urgent: "destructive",
};

// The API filters, sorts and pages, and only ever returns leads inside the
// member's record scope. The list asks for one page of the size the member
// chose. The board and analytics need several stages at once, so they ask for
// the largest page the shared contract allows and say so when there are more.
const BOARD_PAGE_SIZE = 100;
const SEARCH_DEBOUNCE_MS = 350;

const ALL = "all";

// "Self / My team / All": the widest choice the member's scope allows comes first.
type OwnershipFilter = "self" | "team" | "all";
const OWNERSHIP_LABELS: Record<OwnershipFilter, string> = { self: "My leads", team: "My team's leads", all: "All leads" };
const ownershipChoices = (scope: "own" | "team" | "all" | undefined, hasTeam: boolean): OwnershipFilter[] => {
  if (scope === "all") return hasTeam ? ["all", "team", "self"] : ["all", "self"];
  if (scope === "team" && hasTeam) return ["team", "self"];
  return ["self"];
};

const dateCell = (value?: string) => (value ? new Date(value).toLocaleDateString("en-IN") : "—");

export default function LeadsPage() {
  const { user, can } = useAuth();
  if (!user) return null;
  if (!can("leads.view")) return <NoAccess title="Leads" area="Leads" module="leads" />;
  return <LeadsWorkspace />;
}

// Each control is gated by the key its API route checks (leads.routes.js).
function LeadsWorkspace() {
  const dispatch = useAppDispatch();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const view = (searchParams.get("view") as ViewMode) || "list";

  const { can, canAll } = useAuth();
  const canCreate = can("leads.create");
  const canUpdate = can("leads.update");
  const canDelete = can("leads.delete");
  const canBulk = can("leads.bulk");
  const canExport = can("leads.export");
  const canConvert = canAll(["leads.update", "contacts.create"]);
  const canLookupMembers = can("members.lookup");
  const canManagePipeline = can("leads.pipeline.manage");
  // At the plan's lead limit the API refuses every new lead, so say so up front.
  const { summary: usage, refresh: refreshUsage } = useUsage();
  const atLeadLimit = leadsFull(usage);

  const { leads, isLoading, hasAnyWithoutFilters, emptyState } = useAppSelector((state) => state.leads);
  const pagination = useAppSelector((state) => state.leads.pagination);
  const statuses = useAppSelector((state) => state.leads.statuses);
  const statusesLoading = useAppSelector((state) => state.leads.statusesLoading);
  const pipelines = useAppSelector((state) => state.leads.pipelines);
  const pipelinesError = useAppSelector((state) => state.leads.pipelinesError);
  const activities = useAppSelector((state) => state.leads.activeLeadActivities);
  const notes = useAppSelector((state) => state.leads.activeLeadNotes);
  // Active teammates (names only), readable by every role.
  const owners = useAppSelector((state) => state.orgUsers.memberOptions);
  const storageOn = useAppSelector((state) => isFeatureOn(state.features, "storage_enabled"));
  const featuresLoaded = useAppSelector((state) => state.features.isLoaded);

  const { user } = useAuth();

  // Which board this screen is showing. Every org has at least one pipeline, so
  // this settles once the list arrives: the member's last one if it still
  // exists, otherwise the organization's default.
  const [activePipelineId, setActivePipelineId] = useState<string | null>(null);
  const [pipelineSettingsOpen, setPipelineSettingsOpen] = useState(false);
  // A move waiting on a reason, because the stage asks for one, and whatever
  // was due to run once that move went through (the lead form's other fields).
  const [reasonRequest, setReasonRequest] = useState<StageReasonRequest | null>(null);
  const pendingAfterMove = useRef<(() => void) | null>(null);

  const ownership = ownershipChoices(user?.scopes?.leads, !!user?.teamId);
  const [ownershipFilter, setOwnershipFilter] = useState<OwnershipFilter>(ownership[0]);
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [stageFilter, setStageFilter] = useState(ALL);
  const [ownerFilter, setOwnerFilter] = useState(ALL);
  const [priorityFilter, setPriorityFilter] = useState(ALL);
  const [temperatureFilter, setTemperatureFilter] = useState(ALL);

  const [detailLeadId, setDetailLeadId] = useState<string | null>(null);
  const [editLead, setEditLead] = useState<Lead | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [formMode, setFormMode] = useState<"create" | "edit">("create");

  const setView = useCallback(
    (next: ViewMode) => {
      const params = new URLSearchParams(searchParams.toString());
      params.set("view", next);
      router.replace(`${pathname}?${params.toString()}`);
    },
    [pathname, router, searchParams],
  );

  // The same filters go to the list, the board, the export and any bulk action
  // over "everything matching". `pipeline_id` rides along so all four read the
  // same board; without it the API would answer for the default one.
  const filters = useMemo(
    () => ({
      search: search.trim() || undefined,
      pipeline_id: activePipelineId ?? undefined,
      status_id: stageFilter !== ALL ? stageFilter : undefined,
      assigned_to: ownerFilter !== ALL ? ownerFilter : undefined,
      priority: priorityFilter !== ALL ? priorityFilter : undefined,
      temperature: temperatureFilter !== ALL ? temperatureFilter : undefined,
      owner: ownershipFilter,
    }),
    [search, activePipelineId, stageFilter, ownerFilter, priorityFilter, temperatureFilter, ownershipFilter],
  );

  // The ownership picker counts as a filter only when the member has narrowed it
  // past the widest choice their role allows. Picking a board is not filtering,
  // so `pipeline_id` is left out: an empty board should offer "add a lead",
  // not "clear filters". The API's own rule matches.
  const hasFilters =
    search.trim() !== "" ||
    stageFilter !== ALL ||
    ownerFilter !== ALL ||
    priorityFilter !== ALL ||
    temperatureFilter !== ALL ||
    ownershipFilter !== ownership[0];

  // A saved view carries the filter values the API itself speaks, so applying
  // one is a matter of putting them back into these controls.
  const applyFilters = useCallback(
    (next: Record<string, string>) => {
      setSearchInput(next.search ?? "");
      setSearch(next.search ?? "");
      // A view saved on another board switches the board too, or its stage
      // filter would name a stage this one does not have.
      if (next.pipeline_id) setActivePipelineId(next.pipeline_id);
      setStageFilter(next.status_id ?? ALL);
      setOwnerFilter(next.assigned_to ?? ALL);
      setPriorityFilter(next.priority ?? ALL);
      setTemperatureFilter(next.temperature ?? ALL);
      setOwnershipFilter((next.owner as OwnershipFilter) ?? ownership[0]);
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [ownership[0]],
  );

  const list = useServerList({
    listKey: LIST_KEY,
    filters,
    hasFilters,
    onApplyFilters: applyFilters,
    onApplyViewMode: (mode) => setView(mode === "kanban" ? "kanban" : "list"),
  });

  const clearFilters = () => {
    applyFilters({});
    list.resetPaging();
  };

  // The board and analytics read the largest page the contract allows rather
  // than every row: the old screen asked for 1000 at once, which the API now
  // refuses outright.
  const query = useMemo(
    () => (view === "list" ? list.query : { ...list.filters, page: 1, per_page: BOARD_PAGE_SIZE }),
    [view, list.query, list.filters],
  );

  // Held until the board is known, or the first page would be the default
  // pipeline's and then be replaced a moment later by the remembered one's. If
  // the pipelines themselves can't be read, the list still loads: the API falls
  // back to the default board, which beats an empty screen.
  const refreshLeads = useCallback(() => {
    if (!activePipelineId && !pipelinesError) return;
    dispatch(reqToGetLeads({ data: query }));
  }, [dispatch, query, activePipelineId, pipelinesError]);

  useEffect(() => {
    refreshLeads();
  }, [refreshLeads]);

  useEffect(() => {
    const timer = setTimeout(() => {
      setSearch(searchInput);
      list.resetPaging();
    }, SEARCH_DEBOUNCE_MS);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchInput]);

  // Any filter change starts again at page 1, and drops a selection that may
  // no longer be on screen.
  const changeFilter = <T,>(setter: (value: T) => void) => (value: T) => {
    setter(value);
    list.resetPaging();
  };

  // Switching board starts the list again and drops a stage filter that names a
  // stage the new board does not have.
  const changePipeline = (pipelineId: string) => {
    if (pipelineId === activePipelineId) return;
    setActivePipelineId(pipelineId);
    setStageFilter(ALL);
    list.clearSelection();
    list.resetPaging();
  };

  useEffect(() => {
    dispatch(reqToGetPipelines({ data: null }));
    if (canLookupMembers) dispatch(reqToGetMemberOptions({ data: null }));
    if (!featuresLoaded) dispatch(reqToGetFeatures({}));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dispatch]);

  // Settle the board once the pipelines are known, and again if the one being
  // shown disappears. A remembered id is only trusted while it still exists.
  useEffect(() => {
    if (!pipelines.length) return;
    if (activePipelineId && pipelines.some((pipeline) => pipeline.id === activePipelineId)) return;
    const remembered = readLastPipeline(user?.id);
    const fallback = pipelines.find((pipeline) => pipeline.isDefault) ?? pipelines[0];
    const next = remembered && pipelines.some((pipeline) => pipeline.id === remembered) ? remembered : fallback.id;
    setActivePipelineId(next);
  }, [pipelines, activePipelineId, user?.id]);

  // The stage list is always the shown board's, never a mix, so it reloads with
  // the board. Changing board also drops a stage filter naming the old one.
  useEffect(() => {
    if (!activePipelineId) return;
    dispatch(reqToGetLeadStatuses({ data: { pipeline_id: activePipelineId } }));
    writeLastPipeline(user?.id, activePipelineId);
  }, [activePipelineId, dispatch, user?.id]);

  useEffect(() => {
    if (!detailLeadId) return;
    dispatch(reqToGetLeadActivities({ data: { id: detailLeadId, limit: 100 } }));
    dispatch(reqToGetLeadNotes({ data: { id: detailLeadId } }));
  }, [detailLeadId, dispatch]);

  // A notification about a lead lands here with ?lead=<id>. The sheet reads the lead
  // out of the loaded page, so it only opens once that lead is in the list; either
  // way the parameter is cleared, so a reload does not reopen it and a lead that is
  // not on this page simply leaves the person on the list.
  const deepLinkLeadId = searchParams.get("lead");
  useEffect(() => {
    if (!deepLinkLeadId || isLoading) return;
    if (leads.some((candidate) => candidate.id === deepLinkLeadId)) setDetailLeadId(deepLinkLeadId);
    const params = new URLSearchParams(searchParams.toString());
    params.delete("lead");
    const query = params.toString();
    router.replace(query ? `${pathname}?${query}` : pathname);
  }, [deepLinkLeadId, isLoading, leads, pathname, router, searchParams]);

  const orderedStages = useMemo(
    () => [...statuses].sort((a: LeadStage, b: LeadStage) => a.sortOrder - b.sortOrder),
    [statuses],
  );
  const bulkStages = orderedStages.filter((stage) => !stage.requiresReason);

  const total = pagination?.total ?? leads.length;
  const chosen = selectionCount(list.selection);
  const allMatching = list.selection.mode === "all_matching";

  // Pickers offer only people the member may assign to (own scope: themself;
  // team scope: their team). Editing keeps the lead's current owner listed so
  // the form shows it; the API checks only a change.
  const assignableOwners = owners.filter((owner) => owner.assignable?.leads !== false);
  const formOwners =
    editLead?.assignedTo && !assignableOwners.some((owner) => owner.id === editLead.assignedTo)
      ? [...assignableOwners, ...owners.filter((owner) => owner.id === editLead.assignedTo)]
      : assignableOwners;
  const failed = (fallback: string) => (error: unknown) => notify(apiErrorMessage(error, fallback), { type: "error" });

  // The server re-counts "everything matching" under a lock before it acts. If
  // the number moved, nothing was changed: reload so the member sees the real
  // count, and let them decide whether to run it again.
  const bulkFailed = (fallback: string) => (error: unknown) => {
    if (isCountChanged(error)) {
      refreshLeads();
      list.clearSelection();
      notify(
        `${apiErrorMessage(error, "The list changed while you were working.")} Nothing was changed — check the new count and try again.`,
        { type: "error" },
      );
      return;
    }
    failed(fallback)(error);
  };

  const openCreate = () => {
    setFormMode("create");
    setEditLead(null);
    setFormOpen(true);
  };

  // Opens this form when the top bar's Create menu links here with ?new=1.
  useCreateFromUrl(openCreate);

  const openEdit = (lead: Lead) => {
    setFormMode("edit");
    setEditLead(lead);
    setFormOpen(true);
  };

  const handleFormSubmit = (values: LeadFormValues) => {
    // A new lead joins the board the member is looking at. The stage picker only
    // offers that board's stages, so the two always agree.
    const apiBody = mapLeadPayloadToApi({ ...values, pipelineId: activePipelineId ?? undefined });

    if (formMode === "create") {
      dispatch(
        reqToCreateLead({
          data: apiBody,
          onSuccess: () => {
            notify("Lead created.", { type: "success" });
            refreshLeads();
            refreshUsage();
          },
          onFailure: (error: unknown) => {
            // The API's message names the limit and ends with what the caller can do.
            const refusal = limitRefusalFrom(error);
            if (refusal) {
              notify(refusal.message, { type: "error" });
              refreshUsage();
              return;
            }
            notify(apiErrorMessage(error, "Couldn't create lead. Please try again."), { type: "error" });
          },
        }),
      );
      return;
    }

    if (!editLead) return;

    // The stage goes through the dedicated endpoint below, and the board is not
    // something this form changes, so neither rides along with the other fields:
    // a `pipeline_id` sent without a stage from that board is refused.
    const { status_id: _stageId, pipeline_id: _boardId, ...otherFields } = apiBody;
    const stageChanged = editLead.statusId !== values.statusId;

    const updateRemainingFields = () => {
      dispatch(
        reqToUpdateLead({
          data: { id: editLead.id, ...otherFields },
          onSuccess: () => {
            notify("Lead updated.", { type: "success" });
            refreshLeads();
          },
          onFailure: failed("Couldn't update lead. Please try again."),
        }),
      );
    };

    if (stageChanged) {
      // The dedicated stage endpoint is what writes the "Stage changed"
      // activity log entry server-side — a plain field PATCH doesn't log it,
      // and a stage that requires a reason refuses a plain PATCH outright.
      moveLeadToStage(editLead.id, values.statusId, updateRemainingFields);
    } else {
      updateRemainingFields();
    }
  };

  const handleDelete = (id: string) => {
    dispatch(
      reqToDeleteLead({
        data: { id },
        onSuccess: () => {
          notify("Lead deleted.", { type: "success" });
          list.clearSelection();
          refreshLeads();
        },
        onFailure: failed("Couldn't delete lead. Please try again."),
      }),
    );
  };

  // Every bulk action sends either the ticked ids or "everything matching these
  // filters" with the count the member was shown.
  const runBulk = (
    thunk: typeof reqToBulkUpdateLeads | typeof reqToBulkDeleteLeads,
    extra: Record<string, unknown> | undefined,
    done: string,
    fallback: string,
  ) => {
    const payload = list.bulkPayload(extra);
    if (!payload) return;
    dispatch(
      thunk({
        data: payload,
        onSuccess: () => {
          notify(done, { type: "success" });
          list.clearSelection();
          refreshLeads();
        },
        onFailure: bulkFailed(fallback),
      }),
    );
  };

  const handleBulkDelete = () =>
    runBulk(reqToBulkDeleteLeads, undefined, `${chosen} lead(s) deleted.`, "Couldn't delete leads. Please try again.");

  const handleBulkStageChange = (stageId: string) =>
    runBulk(reqToBulkUpdateLeads, { data: { status_id: stageId } }, `Moved ${chosen} lead(s).`, "Couldn't move leads. Please try again.");

  const handleBulkAssign = (ownerId: string) =>
    runBulk(reqToBulkUpdateLeads, { data: { assigned_to: ownerId } }, `Reassigned ${chosen} lead(s).`, "Couldn't reassign leads. Please try again.");

  // Every stage change goes through here, whichever control started it, so the
  // "require a reason" rule is asked about once and in one place. A stage that
  // needs one is prompted for before the request goes out; if the API still
  // refuses (the rule was turned on while this screen was open), the same
  // prompt opens rather than a toast the member can do nothing with.
  const submitStageChange = (
    leadId: string,
    statusId: string,
    reason: string | undefined,
    after?: () => void,
  ) => {
    const lead = leads.find((candidate) => candidate.id === leadId);
    const stage = statuses.find((candidate) => candidate.id === statusId);
    dispatch(
      reqToChangeLeadStage({
        data: { id: leadId, status_id: statusId, reason },
        onSuccess: () => {
          setReasonRequest(null);
          if (after) after();
          else refreshLeads();
        },
        onFailure: (error: unknown) => {
          if (apiErrorCode(error) === "REASON_REQUIRED") {
            setReasonRequest({
              leadId,
              leadName: lead?.fullName ?? "this lead",
              statusId,
              stageName: stage?.name ?? "this stage",
              refused: true,
            });
            return;
          }
          setReasonRequest(null);
          failed("Couldn't move lead. Please try again.")(error);
        },
      }),
    );
  };

  // What `after` is for: the lead form changes the stage first and the rest of
  // the fields second, so the follow-up edit has to wait for the move.
  const moveLeadToStage = (leadId: string, statusId: string, after?: () => void) => {
    const stage = statuses.find((candidate) => candidate.id === statusId);
    if (stage?.requiresReason) {
      const lead = leads.find((candidate) => candidate.id === leadId);
      setReasonRequest({
        leadId,
        leadName: lead?.fullName ?? "this lead",
        statusId,
        stageName: stage.name,
      });
      pendingAfterMove.current = after ?? null;
      return;
    }
    submitStageChange(leadId, statusId, undefined, after);
  };

  const handleMoveLead = (leadId: string, newStatusId: string) => moveLeadToStage(leadId, newStatusId);

  const handleAddActivity = (
    leadId: string,
    values: { activityType: LeadActivityType; subject: string; description?: string },
  ) => {
    dispatch(
      reqToAddLeadActivity({
        data: {
          id: leadId,
          activity_type: values.activityType,
          subject: values.subject,
          description: values.description,
        },
        onSuccess: () => dispatch(reqToGetLeadActivities({ data: { id: leadId, limit: 100 } })),
        onFailure: () => notify("Couldn't log activity. Please try again.", { type: "error" }),
      }),
    );
  };

  const handleAddNote = (leadId: string, note: string) => {
    dispatch(
      reqToCreateLeadNote({
        data: { id: leadId, note },
        onSuccess: () => dispatch(reqToGetLeadNotes({ data: { id: leadId } })),
        onFailure: () => notify("Couldn't add note. Please try again.", { type: "error" }),
      }),
    );
  };

  const handleUpdateNote = (noteId: string, note: string) => {
    dispatch(
      reqToUpdateLeadNote({
        data: { noteId, note },
        onSuccess: () => {
          if (detailLeadId) dispatch(reqToGetLeadNotes({ data: { id: detailLeadId } }));
        },
        onFailure: () => notify("Couldn't update note. Please try again.", { type: "error" }),
      }),
    );
  };

  const handleDeleteNote = (noteId: string) => {
    dispatch(
      reqToDeleteLeadNote({
        data: { noteId },
        onSuccess: () => {
          if (detailLeadId) dispatch(reqToGetLeadNotes({ data: { id: detailLeadId } }));
        },
        onFailure: () => notify("Couldn't delete note. Please try again.", { type: "error" }),
      }),
    );
  };

  // Conversion creates a contact and stamps the lead with its id. The lead stays
  // in the pipeline, so the list is refreshed rather than the row removed.
  const handleConvertLead = (lead: Lead) => {
    dispatch(
      reqToConvertLead({
        data: { leadId: lead.id },
        onSuccess: () => {
          notify(`${lead.fullName} is now a contact.`, { type: "success" });
          setDetailLeadId(null);
          refreshLeads();
        },
        onFailure: (error: any) =>
          notify(
            error?.response?.data?.message ?? "Couldn't convert this lead. Please try again.",
            { type: "error" },
          ),
      }),
    );
  };

  // The API serves this copy with the column choices; the local map is the
  // fallback for the first render, before the preferences come back.
  const help = (key: string) => list.fieldHelp[key] ?? helpFor(LIST_KEY, key);

  // Keys match the API's own column catalog, so a stored column choice and a
  // saved view mean the same thing on both sides.
  const columns: ServerListColumn<Lead>[] = [
    {
      key: "full_name",
      header: "Name",
      label: "Name",
      sortBy: "full_name",
      render: (row) => (
        <button type="button" className="text-left hover:underline" onClick={() => setDetailLeadId(row.id)}>
          <Truncated value={row.fullName} className="font-medium" />
          {row.companyName && <Truncated value={row.companyName} className="text-xs text-muted-foreground" />}
        </button>
      ),
    },
    { key: "company_name", header: "Company", render: (row) => <Truncated value={row.companyName} /> },
    { key: "email", header: "Email", render: (row) => <Truncated value={row.email} /> },
    { key: "mobile", header: "Mobile", render: (row) => row.mobile ?? "—" },
    {
      key: "stage",
      header: "Stage",
      help: help("stage"),
      render: (row) => {
        const stage = statuses.find((candidate) => candidate.id === row.statusId);
        if (!stage) return "—";
        // A closed lead is marked on the row, so the list reads the same as the
        // board's column badge and the analytics win rate.
        const outcome = stageOutcome(stage);
        return (
          <div className="flex items-center gap-1">
            <Badge variant="outline" style={{ borderColor: stage.color, color: stage.color }}>
              {stage.name}
            </Badge>
            {outcome && (
              <Badge variant={outcome === "won" ? "default" : "destructive"} className="text-[10px]">
                {OUTCOME_LABEL[outcome]}
              </Badge>
            )}
          </div>
        );
      },
    },
    {
      key: "assignee",
      header: "Owner",
      help: help("assignee"),
      render: (row) =>
        row.assignedTo ? (
          <Truncated value={resolveOwnerName(owners, row.assignedTo)} width="max-w-40" />
        ) : (
          <span className="text-muted-foreground">Unassigned</span>
        ),
    },
    {
      key: "priority",
      header: "Priority",
      sortBy: "priority",
      help: help("priority"),
      render: (row) => (
        <Badge variant={PRIORITY_VARIANT[row.priority]} className="capitalize">
          {row.priority}
        </Badge>
      ),
    },
    {
      key: "temperature",
      header: "Temperature",
      sortBy: "temperature",
      help: help("temperature"),
      render: (row) => (
        <Badge variant="secondary" className="capitalize">
          {row.temperature}
        </Badge>
      ),
    },
    { key: "lead_score", header: "Score", sortBy: "lead_score", help: help("lead_score"), render: (row) => row.leadScore },
    {
      key: "value",
      header: "Value",
      sortBy: "value",
      help: help("value"),
      render: (row) => (typeof row.value === "number" ? `₹${row.value.toLocaleString("en-IN")}` : "—"),
    },
    {
      key: "expected_budget",
      header: "Expected budget",
      help: help("expected_budget"),
      render: (row) => (typeof row.expectedBudget === "number" ? `₹${row.expectedBudget.toLocaleString("en-IN")}` : "—"),
    },
    {
      key: "probability",
      header: "Probability",
      sortBy: "probability",
      help: help("probability"),
      render: (row) => (typeof row.probability === "number" ? `${row.probability}%` : "—"),
    },
    {
      key: "tags",
      header: "Tags",
      help: help("tags"),
      render: (row) => (
        <div className="flex flex-wrap gap-1">
          {row.tags.slice(0, 3).map((tag) => (
            <Badge key={tag} variant="outline" className="text-xs">
              {tag}
            </Badge>
          ))}
          {row.tags.length > 3 && <Badge variant="outline" className="text-xs">+{row.tags.length - 3}</Badge>}
        </div>
      ),
    },
    { key: "first_name", header: "First name", render: (row) => <Truncated value={row.firstName} /> },
    { key: "last_name", header: "Last name", render: (row) => <Truncated value={row.lastName} /> },
    { key: "alternate_mobile", header: "Alternate mobile", render: (row) => row.alternateMobile ?? "—" },
    { key: "designation", header: "Designation", render: (row) => <Truncated value={row.designation} /> },
    { key: "website", header: "Website", render: (row) => <Truncated value={row.website} /> },
    { key: "description", header: "Notes", render: (row) => <Truncated value={row.description} /> },
    { key: "created_at", header: "Created", sortBy: "created_at", render: (row) => dateCell(row.createdAt) },
    { key: "updated_at", header: "Updated", sortBy: "updated_at", render: (row) => dateCell(row.updatedAt) },
  ];

  const leading: ServerListColumn<Lead>[] = canBulk
    ? [{ key: "select", header: "", render: () => null }]
    : [];

  const trailing: ServerListColumn<Lead>[] = [
    {
      key: "actions",
      header: "",
      className: "text-right",
      render: (row) => (
        <div className="flex justify-end gap-2">
          {canUpdate && (
            <Button variant="outline" size="sm" onClick={() => openEdit(row)}>
              Edit
            </Button>
          )}
          {canDelete && (
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="destructive" size="sm">
                  Delete
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Delete {row.fullName}?</AlertDialogTitle>
                  <AlertDialogDescription>
                    This removes the lead from your pipeline. This can&apos;t be undone.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction onClick={() => handleDelete(row.id)}>Delete</AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          )}
        </div>
      ),
    },
  ];

  const detailLead = leads.find((candidate) => candidate.id === detailLeadId) ?? null;

  // Exporting follows the selection: the ticked rows, or everything the filters
  // match when nothing is ticked.
  const exportParams = { ...list.filters, ...exportSelectionParams(list.selection) };
  const exportScope =
    list.selection.mode === "ids"
      ? `The ${list.selection.ids.length} selected lead(s)`
      : `All ${total.toLocaleString("en-IN")} lead(s) matching your filters`;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Leads</h1>
          <p className="text-muted-foreground">Track and manage your sales pipeline.</p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
        {canExport && (
          <ExportButton path={apiRoutes.leadsExport} params={exportParams} fileName="leads" scopeLabel={exportScope} />
        )}
        <LeadFormDialog
          mode={formMode}
          initialLead={editLead ?? undefined}
          statuses={statuses}
          owners={formOwners}
          open={formOpen}
          onOpenChange={setFormOpen}
          onSubmit={handleFormSubmit}
          trigger={
            canCreate && !atLeadLimit ? (
              <Button onClick={openCreate}>
                <Plus className="h-4 w-4" /> New Lead
              </Button>
            ) : undefined
          }
        />
        {canCreate && atLeadLimit && (
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                {/* A disabled button gets no pointer events, so the span carries the tooltip. */}
                <span tabIndex={0} className="inline-flex">
                  <Button disabled aria-describedby="lead-limit-tooltip">
                    <Plus className="h-4 w-4" /> New Lead
                  </Button>
                </span>
              </TooltipTrigger>
              <TooltipContent id="lead-limit-tooltip" className="max-w-xs">
                Your plan&apos;s lead limit is reached. {usage?.upgradeMessage}
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        )}
        </div>
      </div>

      {atLeadLimit && usage?.measures.leads && (
        <Alert variant="destructive">
          <AlertTitle>Lead limit reached</AlertTitle>
          <AlertDescription>
            Your organization has {formatCount(usage.measures.leads.used)} of the {formatCount(usage.measures.leads.limit ?? 0)} leads
            its plan allows, so no new leads can be added. Existing leads are kept. {usage.upgradeMessage}
          </AlertDescription>
        </Alert>
      )}

      {activePipelineId && !statusesLoading && statuses.length === 0 && (
        <Alert>
          <AlertTitle>This pipeline has no stages</AlertTitle>
          <AlertDescription>
            A lead needs a stage to sit in, so no leads can be added here yet.{" "}
            {canManagePipeline
              ? "Use the pencil beside the pipeline name to add the first stage."
              : "Ask an admin to add the stages for this pipeline."}
          </AlertDescription>
        </Alert>
      )}

      <HeldLeadsNotice />

      <Tabs value={view} onValueChange={(next) => setView(next as ViewMode)}>
        <TabsList>
          <TabsTrigger value="list">List</TabsTrigger>
          <TabsTrigger value="kanban">Kanban</TabsTrigger>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
        </TabsList>
      </Tabs>

      {view !== "analytics" && (
        <SavedViewsBar
          listKey={LIST_KEY}
          activeViewId={list.activeViewId}
          onApply={list.applyView}
          current={{
            filters,
            sort: list.sort,
            columns: list.columns,
            viewMode: view === "kanban" ? "kanban" : "table",
          }}
        />
      )}

      {/* One toolbar. The pipeline comes first because it decides what every
          control after it is working on, and it stays on the Analytics tab
          (which has no filters) because those figures are per pipeline too. */}
      <div className="flex flex-wrap items-center gap-2">
        <PipelineSelector
          pipelines={pipelines}
          value={activePipelineId}
          onChange={changePipeline}
          onEdit={canManagePipeline ? () => setPipelineSettingsOpen(true) : undefined}
        />

        {view !== "analytics" && (
          <>
          <Separator orientation="vertical" className="mx-1 h-6" />

          {ownership.length > 1 ? (
            <Select value={ownershipFilter} onValueChange={changeFilter((value: string) => setOwnershipFilter(value as OwnershipFilter))}>
              <SelectTrigger className="w-44" aria-label="Whose leads"><SelectValue /></SelectTrigger>
              <SelectContent>
                {ownership.map((choice) => (
                  <SelectItem key={choice} value={choice}>{OWNERSHIP_LABELS[choice]}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          ) : (
            <span className="text-sm text-muted-foreground" title="Your role shows you only the leads assigned to you, or that you created and nobody owns.">
              Showing your leads
            </span>
          )}

          <Input
            value={searchInput}
            onChange={(event) => setSearchInput(event.target.value)}
            placeholder="Search leads..."
            className="max-w-xs"
          />

          <Select value={stageFilter} onValueChange={changeFilter(setStageFilter)}>
            <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL}>All Stages</SelectItem>
              {orderedStages.map((stage) => (
                <SelectItem key={stage.id} value={stage.id}>{stage.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={ownerFilter} onValueChange={changeFilter(setOwnerFilter)}>
            <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL}>All Owners</SelectItem>
              {owners.map((owner) => (
                <SelectItem key={owner.id} value={owner.id}>{owner.fullName}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={priorityFilter} onValueChange={changeFilter(setPriorityFilter)}>
            <SelectTrigger className="w-36"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL}>All Priorities</SelectItem>
              <SelectItem value="low">Low</SelectItem>
              <SelectItem value="medium">Medium</SelectItem>
              <SelectItem value="high">High</SelectItem>
              <SelectItem value="urgent">Urgent</SelectItem>
            </SelectContent>
          </Select>

          <Select value={temperatureFilter} onValueChange={changeFilter(setTemperatureFilter)}>
            <SelectTrigger className="w-36"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL}>All Temperatures</SelectItem>
              <SelectItem value="hot">Hot</SelectItem>
              <SelectItem value="warm">Warm</SelectItem>
              <SelectItem value="cold">Cold</SelectItem>
            </SelectContent>
          </Select>

          {hasFilters && (
            <Button variant="ghost" size="sm" onClick={clearFilters}>
              Clear filters
            </Button>
          )}
          </>
        )}
      </div>

      {chosen > 0 && view === "list" && canBulk && (
        <div className="flex flex-wrap items-center gap-2 rounded-md border border-border bg-muted/40 p-2">
          <span className="text-sm font-medium">
            {allMatching ? `All ${chosen.toLocaleString("en-IN")} matching leads` : `${chosen} selected`}
          </span>

          {/* A stage that needs a reason is left out: one reason cannot speak for
              a whole batch, so the API refuses a bulk move into it. */}
          <Select onValueChange={handleBulkStageChange}>
            <SelectTrigger className="h-8 w-40"><SelectValue placeholder="Change stage" /></SelectTrigger>
            <SelectContent>
              {bulkStages.map((stage) => (
                <SelectItem key={stage.id} value={stage.id}>{stage.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select onValueChange={handleBulkAssign}>
            <SelectTrigger className="h-8 w-40"><SelectValue placeholder="Assign to" /></SelectTrigger>
            <SelectContent>
              {assignableOwners.map((owner) => (
                <SelectItem key={owner.id} value={owner.id}>{owner.fullName}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button size="sm" variant="destructive">Delete</Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>
                  Delete {allMatching ? `all ${chosen.toLocaleString("en-IN")} matching` : chosen} lead(s)?
                </AlertDialogTitle>
                <AlertDialogDescription>
                  {allMatching
                    ? "This deletes every lead matching your current filters, including those on other pages. This can't be undone."
                    : "This can't be undone."}
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={handleBulkDelete}>Delete</AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      )}

      {view === "list" && (
        <ServerList<Lead>
          rows={leads}
          getRowId={(row) => row.id}
          leading={leading}
          columns={columns}
          trailing={trailing}
          isLoading={isLoading}
          pagination={pagination}
          page={list.page}
          perPage={list.perPage}
          onPageChange={list.setPage}
          onPerPageChange={list.setPerPage}
          sort={list.sort}
          onSortChange={list.setSort}
          columnChoices={list.columns}
          columnHelp={list.fieldHelp}
          onColumnsChange={list.saveColumns}
          onColumnsReset={list.resetColumns}
          selection={canBulk ? list.selection : undefined}
          onSelectionChange={canBulk ? list.setSelection : undefined}
          emptyState={emptyState}
          noun={list.nouns?.one ?? "lead"}
          nounPlural={list.nouns?.many ?? "leads"}
          hasFilters={hasFilters}
          hasAnyWithoutFilters={hasAnyWithoutFilters}
          onClearFilters={clearFilters}
          createAction={canCreate && !atLeadLimit ? { label: "New Lead", onClick: openCreate } : undefined}
        />
      )}

      {view === "kanban" && (
        <div className="space-y-2">
          {total > BOARD_PAGE_SIZE && (
            <Alert>
              <AlertTitle>Showing the first {BOARD_PAGE_SIZE} of {total.toLocaleString("en-IN")} leads</AlertTitle>
              <AlertDescription>
                The board loads one page at a time. Narrow the filters, or use the List view to reach the rest.
              </AlertDescription>
            </Alert>
          )}
          <KanbanBoard
            leads={leads}
            statuses={statuses}
            owners={owners}
            onOpen={setDetailLeadId}
            onMoveLead={canUpdate ? handleMoveLead : undefined}
          />
        </div>
      )}

      {view === "analytics" && (
        <div className="space-y-2">
          {total > BOARD_PAGE_SIZE && (
            <Alert>
              <AlertTitle>Based on the first {BOARD_PAGE_SIZE} of {total.toLocaleString("en-IN")} leads</AlertTitle>
              <AlertDescription>
                These figures count the leads loaded on this page only. Server-side lead analytics are still to come.
              </AlertDescription>
            </Alert>
          )}
          <LeadAnalytics leads={leads} statuses={statuses} />
        </div>
      )}

      <LeadDetailSheet
        lead={detailLead}
        activities={activities}
        notes={notes}
        statuses={statuses}
        owners={owners}
        open={!!detailLeadId}
        onOpenChange={(open) => !open && setDetailLeadId(null)}
        onEdit={
          canUpdate
            ? (lead) => {
                setDetailLeadId(null);
                openEdit(lead);
              }
            : undefined
        }
        onAddActivity={canUpdate ? handleAddActivity : undefined}
        onAddNote={canUpdate ? handleAddNote : undefined}
        onUpdateNote={canUpdate ? handleUpdateNote : undefined}
        onDeleteNote={canUpdate ? handleDeleteNote : undefined}
        onConvert={canConvert ? handleConvertLead : undefined}
        attachments={storageOn ? { canUpload: canUpdate, canDelete: canUpdate } : undefined}
      />

      <StageReasonDialog
        request={reasonRequest}
        onCancel={() => {
          pendingAfterMove.current = null;
          setReasonRequest(null);
        }}
        onConfirm={(reason) => {
          if (!reasonRequest) return;
          const after = pendingAfterMove.current ?? undefined;
          pendingAfterMove.current = null;
          submitStageChange(reasonRequest.leadId, reasonRequest.statusId, reason, after);
        }}
      />

      {canManagePipeline && (
        <PipelineSettingsDialog
          open={pipelineSettingsOpen}
          onOpenChange={setPipelineSettingsOpen}
          activePipelineId={activePipelineId}
          canManage={canManagePipeline}
          onChanged={() => {
            if (activePipelineId) dispatch(reqToGetLeadStatuses({ data: { pipeline_id: activePipelineId } }));
            refreshLeads();
          }}
          // The board being shown has just been removed, so nothing can be read
          // for it: clearing this lets the pipeline list pick the default again.
          onPipelineRemoved={() => {
            setActivePipelineId(null);
            setStageFilter(ALL);
            list.clearSelection();
          }}
        />
      )}
    </div>
  );
}
