"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
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
  reqToUpdateLead,
  reqToUpdateLeadNote,
} from "@/lib/store/slices/leadsSlice";
import { reqToGetMemberOptions } from "@/lib/store/slices/orgUsersSlice";
import { isFeatureOn, reqToGetFeatures } from "@/lib/store/slices/featuresSlice";
import { reqToConvertLead } from "@/lib/store/slices/contactsSlice";
import { mapLeadPayloadToApi } from "@/lib/leads/mappers";
import { resolveOwnerName, type Lead, type LeadActivityType } from "@/lib/leads/types";
import { FALLBACK_LEAD_STATUSES } from "@/lib/leads/fallback-data";
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
import { LeadDetailSheet } from "@/components/leads/lead-detail-sheet";
import { LeadAnalytics } from "@/components/leads/lead-analytics";
import { NoAccess } from "@/components/auth/no-access";
import { apiErrorMessage } from "@/lib/auth/errors";
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
  // At the plan's lead limit the API refuses every new lead, so say so up front.
  const { summary: usage, refresh: refreshUsage } = useUsage();
  const atLeadLimit = leadsFull(usage);

  const { leads, isLoading, hasAnyWithoutFilters, emptyState } = useAppSelector((state) => state.leads);
  const pagination = useAppSelector((state) => state.leads.pagination);
  const apiStatuses = useAppSelector((state) => state.leads.statuses);
  const activities = useAppSelector((state) => state.leads.activeLeadActivities);
  const notes = useAppSelector((state) => state.leads.activeLeadNotes);
  // Active teammates (names only), readable by every role.
  const owners = useAppSelector((state) => state.orgUsers.memberOptions);
  const storageOn = useAppSelector((state) => isFeatureOn(state.features, "storage_enabled"));
  const featuresLoaded = useAppSelector((state) => state.features.isLoaded);

  // Stopgap: the backend isn't seeded for every org yet (empty statuses
  // list). Fall back to static placeholders so the form isn't blocked; real
  // data takes over automatically once it exists.
  const statuses = apiStatuses.length > 0 ? apiStatuses : FALLBACK_LEAD_STATUSES;

  const { user } = useAuth();
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
  // over "everything matching". Placeholder stages (an org with no pipeline yet)
  // have no real id, so they are left out.
  const filters = useMemo(
    () => ({
      search: search.trim() || undefined,
      status_id: stageFilter !== ALL && /^\d+$/.test(stageFilter) ? stageFilter : undefined,
      assigned_to: ownerFilter !== ALL ? ownerFilter : undefined,
      priority: priorityFilter !== ALL ? priorityFilter : undefined,
      temperature: temperatureFilter !== ALL ? temperatureFilter : undefined,
      owner: ownershipFilter,
    }),
    [search, stageFilter, ownerFilter, priorityFilter, temperatureFilter, ownershipFilter],
  );

  // The ownership picker counts as a filter only when the member has narrowed it
  // past the widest choice their role allows.
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

  const refreshLeads = useCallback(() => {
    dispatch(reqToGetLeads({ data: query }));
  }, [dispatch, query]);

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

  useEffect(() => {
    dispatch(reqToGetLeadStatuses({ data: null }));
    if (canLookupMembers) dispatch(reqToGetMemberOptions({ data: null }));
    if (!featuresLoaded) dispatch(reqToGetFeatures({}));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dispatch]);

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
    const apiBody = mapLeadPayloadToApi(values);

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

    const { status_id, ...otherFields } = apiBody;
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
      // activity log entry server-side — a plain field PATCH doesn't log it.
      dispatch(
        reqToChangeLeadStage({
          data: { id: editLead.id, status_id },
          onSuccess: updateRemainingFields,
          onFailure: failed("Couldn't change lead stage. Please try again."),
        }),
      );
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

  const handleMoveLead = (leadId: string, newStatusId: string) => {
    dispatch(
      reqToChangeLeadStage({
        data: { id: leadId, status_id: newStatusId },
        onSuccess: refreshLeads,
        onFailure: failed("Couldn't move lead. Please try again."),
      }),
    );
  };

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
        return stage ? (
          <Badge variant="outline" style={{ borderColor: stage.color, color: stage.color }}>
            {stage.name}
          </Badge>
        ) : (
          "—"
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

      {view !== "analytics" && (
        <div className="flex flex-wrap items-center gap-2">
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
              {statuses.map((stage) => (
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
        </div>
      )}

      {chosen > 0 && view === "list" && canBulk && (
        <div className="flex flex-wrap items-center gap-2 rounded-md border border-border bg-muted/40 p-2">
          <span className="text-sm font-medium">
            {allMatching ? `All ${chosen.toLocaleString("en-IN")} matching leads` : `${chosen} selected`}
          </span>

          <Select onValueChange={handleBulkStageChange}>
            <SelectTrigger className="h-8 w-40"><SelectValue placeholder="Change stage" /></SelectTrigger>
            <SelectContent>
              {statuses.map((stage) => (
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
    </div>
  );
}
