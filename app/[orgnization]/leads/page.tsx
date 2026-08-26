"use client";

import { useEffect, useMemo, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Plus } from "lucide-react";

import { notify } from "@/lib/commonFunctions";
import { useAppDispatch, useAppSelector } from "@/lib/store/hooks";
import { useAuth } from "@/hooks/useAuth";
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
import { reqToGetOrgUsers } from "@/lib/store/slices/orgUsersSlice";
import { mapLeadPayloadToApi } from "@/lib/leads/mappers";
import { resolveOwnerName, type Lead, type LeadActivityType } from "@/lib/leads/types";
import { FALLBACK_LEAD_STATUSES, FALLBACK_OWNERS } from "@/lib/leads/fallback-data";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { DataTable, type DataTableColumn } from "@/components/ui/data-table";
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

type ViewMode = "list" | "kanban" | "analytics";

const PRIORITY_VARIANT: Record<Lead["priority"], "default" | "secondary" | "outline" | "destructive"> = {
  low: "outline",
  medium: "secondary",
  high: "default",
  urgent: "destructive",
};

// Fetches once with a generous page size and relies on client-side
// filter/search/sort (matches the DataTable's existing client-side mode).
// Revisit with real server-driven pagination if a single org's lead count
// starts approaching this.
const LEADS_FETCH_LIMIT = 1000;

export default function LeadsPage() {
  const dispatch = useAppDispatch();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const view = (searchParams.get("view") as ViewMode) || "list";

  const { role } = useAuth();
  const isAdmin = role === "org_admin";

  const { leads, isLoading } = useAppSelector((state) => state.leads);
  const apiStatuses = useAppSelector((state) => state.leads.statuses);
  const activities = useAppSelector((state) => state.leads.activeLeadActivities);
  const notes = useAppSelector((state) => state.leads.activeLeadNotes);
  const apiOwners = useAppSelector((state) => state.orgUsers.users);

  // Stopgap: the backend isn't seeded/ready for every org yet (empty
  // statuses list) and the org-users list is admin-only, so it 403s for
  // non-admins. Fall back to static placeholders so the form isn't blocked;
  // real data takes over automatically once either is actually populated.
  const statuses = apiStatuses.length > 0 ? apiStatuses : FALLBACK_LEAD_STATUSES;
  const owners = apiOwners.length > 0 ? apiOwners : FALLBACK_OWNERS;

  const [search, setSearch] = useState("");
  const [stageFilter, setStageFilter] = useState("all");
  const [ownerFilter, setOwnerFilter] = useState("all");
  const [priorityFilter, setPriorityFilter] = useState("all");
  const [temperatureFilter, setTemperatureFilter] = useState("all");

  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [detailLeadId, setDetailLeadId] = useState<string | null>(null);
  const [editLead, setEditLead] = useState<Lead | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [formMode, setFormMode] = useState<"create" | "edit">("create");

  const setView = (next: ViewMode) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set("view", next);
    router.replace(`${pathname}?${params.toString()}`);
  };

  const refreshLeads = () => {
    dispatch(reqToGetLeads({ data: { limit: LEADS_FETCH_LIMIT } }));
  };

  useEffect(() => {
    refreshLeads();
    dispatch(reqToGetLeadStatuses({ data: null }));
    dispatch(reqToGetOrgUsers({ data: null }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dispatch]);

  useEffect(() => {
    if (!detailLeadId) return;
    dispatch(reqToGetLeadActivities({ data: { id: detailLeadId, limit: 100 } }));
    dispatch(reqToGetLeadNotes({ data: { id: detailLeadId } }));
  }, [detailLeadId, dispatch]);

  const filteredLeads = useMemo(() => {
    return leads.filter((lead) => {
      if (stageFilter !== "all" && lead.statusId !== stageFilter) return false;
      if (ownerFilter !== "all" && lead.assignedTo !== ownerFilter) return false;
      if (priorityFilter !== "all" && lead.priority !== priorityFilter) return false;
      if (temperatureFilter !== "all" && lead.temperature !== temperatureFilter) return false;
      if (search.trim()) {
        const term = search.trim().toLowerCase();
        const haystack = `${lead.fullName} ${lead.companyName ?? ""} ${lead.email ?? ""}`.toLowerCase();
        if (!haystack.includes(term)) return false;
      }
      return true;
    });
  }, [leads, stageFilter, ownerFilter, priorityFilter, temperatureFilter, search]);

  const openCreate = () => {
    setFormMode("create");
    setEditLead(null);
    setFormOpen(true);
  };

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
          },
          onFailure: () => notify("Couldn't create lead. Please try again.", { type: "error" }),
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
          onFailure: () => notify("Couldn't update lead. Please try again.", { type: "error" }),
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
          onFailure: () => notify("Couldn't change lead stage. Please try again.", { type: "error" }),
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
          setSelectedIds((prev) => {
            const next = new Set(prev);
            next.delete(id);
            return next;
          });
          refreshLeads();
        },
        onFailure: () => notify("Couldn't delete lead. Please try again.", { type: "error" }),
      }),
    );
  };

  const handleBulkDelete = () => {
    dispatch(
      reqToBulkDeleteLeads({
        data: { ids: Array.from(selectedIds) },
        onSuccess: () => {
          notify(`${selectedIds.size} lead(s) deleted.`, { type: "success" });
          setSelectedIds(new Set());
          refreshLeads();
        },
        onFailure: () => notify("Couldn't delete leads. Please try again.", { type: "error" }),
      }),
    );
  };

  const handleBulkStageChange = (stageId: string) => {
    dispatch(
      reqToBulkUpdateLeads({
        data: { ids: Array.from(selectedIds), data: { status_id: stageId } },
        onSuccess: () => {
          notify(`Moved ${selectedIds.size} lead(s).`, { type: "success" });
          setSelectedIds(new Set());
          refreshLeads();
        },
        onFailure: () => notify("Couldn't move leads. Please try again.", { type: "error" }),
      }),
    );
  };

  const handleBulkAssign = (ownerId: string) => {
    dispatch(
      reqToBulkUpdateLeads({
        data: { ids: Array.from(selectedIds), data: { assigned_to: ownerId } },
        onSuccess: () => {
          notify(`Reassigned ${selectedIds.size} lead(s).`, { type: "success" });
          setSelectedIds(new Set());
          refreshLeads();
        },
        onFailure: () => notify("Couldn't reassign leads. Please try again.", { type: "error" }),
      }),
    );
  };

  const handleMoveLead = (leadId: string, newStatusId: string) => {
    dispatch(
      reqToChangeLeadStage({
        data: { id: leadId, status_id: newStatusId },
        onSuccess: refreshLeads,
        onFailure: () => notify("Couldn't move lead. Please try again.", { type: "error" }),
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

  const columns: DataTableColumn<Lead>[] = [
    {
      key: "select",
      header: (
        <Checkbox
          checked={filteredLeads.length > 0 && selectedIds.size === filteredLeads.length}
          onCheckedChange={(checked) =>
            setSelectedIds(checked ? new Set(filteredLeads.map((l) => l.id)) : new Set())
          }
          aria-label="Select all"
        />
      ),
      render: (row) => (
        <Checkbox
          checked={selectedIds.has(row.id)}
          onCheckedChange={(checked) =>
            setSelectedIds((prev) => {
              const next = new Set(prev);
              if (checked) next.add(row.id);
              else next.delete(row.id);
              return next;
            })
          }
          aria-label={`Select ${row.fullName}`}
        />
      ),
    },
    {
      key: "fullName",
      header: "Name",
      sortable: true,
      render: (row) => (
        <button type="button" className="text-left hover:underline" onClick={() => setDetailLeadId(row.id)}>
          <div className="font-medium">{row.fullName}</div>
          {row.companyName && <div className="text-xs text-muted-foreground">{row.companyName}</div>}
        </button>
      ),
    },
    {
      key: "statusId",
      header: "Stage",
      sortable: true,
      accessor: (row) => statuses.find((s) => s.id === row.statusId)?.name ?? "",
      render: (row) => {
        const stage = statuses.find((s) => s.id === row.statusId);
        return stage ? (
          <Badge variant="outline" style={{ borderColor: stage.color, color: stage.color }}>
            {stage.name}
          </Badge>
        ) : null;
      },
    },
    {
      key: "assignedTo",
      header: "Owner",
      sortable: true,
      accessor: (row) => (row.assignedTo ? resolveOwnerName(owners, row.assignedTo) : ""),
      render: (row) =>
        row.assignedTo ? resolveOwnerName(owners, row.assignedTo) : <span className="text-muted-foreground">Unassigned</span>,
    },
    {
      key: "priority",
      header: "Priority",
      sortable: true,
      render: (row) => (
        <Badge variant={PRIORITY_VARIANT[row.priority]} className="capitalize">
          {row.priority}
        </Badge>
      ),
    },
    {
      key: "temperature",
      header: "Temperature",
      sortable: true,
      render: (row) => (
        <Badge variant="secondary" className="capitalize">
          {row.temperature}
        </Badge>
      ),
    },
    { key: "leadScore", header: "Score", sortable: true },
    {
      key: "value",
      header: "Value",
      sortable: true,
      accessor: (row) => row.value ?? 0,
      render: (row) => (typeof row.value === "number" ? `₹${row.value.toLocaleString("en-IN")}` : "—"),
    },
    {
      key: "tags",
      header: "Tags",
      render: (row) => (
        <div className="flex flex-wrap gap-1">
          {row.tags.slice(0, 3).map((tag) => (
            <Badge key={tag} variant="outline" className="text-xs">
              {tag}
            </Badge>
          ))}
        </div>
      ),
    },
    {
      key: "actions",
      header: "",
      render: (row) => (
        <div className="flex justify-end gap-2">
          <Button variant="outline" size="sm" onClick={() => openEdit(row)}>
            Edit
          </Button>
          {isAdmin && (
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

  const detailLead = leads.find((l) => l.id === detailLeadId) ?? null;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Leads</h1>
          <p className="text-muted-foreground">Track and manage your sales pipeline.</p>
        </div>

        <LeadFormDialog
          mode={formMode}
          initialLead={editLead ?? undefined}
          statuses={statuses}
          owners={owners}
          open={formOpen}
          onOpenChange={setFormOpen}
          onSubmit={handleFormSubmit}
          trigger={
            <Button onClick={openCreate}>
              <Plus className="h-4 w-4" /> New Lead
            </Button>
          }
        />
      </div>

      <Tabs value={view} onValueChange={(v) => setView(v as ViewMode)}>
        <TabsList>
          <TabsTrigger value="list">List</TabsTrigger>
          <TabsTrigger value="kanban">Kanban</TabsTrigger>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
        </TabsList>
      </Tabs>

      {view !== "analytics" && (
        <div className="flex flex-wrap items-center gap-2">
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search leads..."
            className="max-w-xs"
          />

          <Select value={stageFilter} onValueChange={setStageFilter}>
            <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Stages</SelectItem>
              {statuses.map((s) => (
                <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={ownerFilter} onValueChange={setOwnerFilter}>
            <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Owners</SelectItem>
              {owners.map((o) => (
                <SelectItem key={o.id} value={o.id}>{o.fullName}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={priorityFilter} onValueChange={setPriorityFilter}>
            <SelectTrigger className="w-36"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Priorities</SelectItem>
              <SelectItem value="low">Low</SelectItem>
              <SelectItem value="medium">Medium</SelectItem>
              <SelectItem value="high">High</SelectItem>
              <SelectItem value="urgent">Urgent</SelectItem>
            </SelectContent>
          </Select>

          <Select value={temperatureFilter} onValueChange={setTemperatureFilter}>
            <SelectTrigger className="w-36"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Temperatures</SelectItem>
              <SelectItem value="hot">Hot</SelectItem>
              <SelectItem value="warm">Warm</SelectItem>
              <SelectItem value="cold">Cold</SelectItem>
            </SelectContent>
          </Select>
        </div>
      )}

      {selectedIds.size > 0 && view === "list" && isAdmin && (
        <div className="flex flex-wrap items-center gap-2 rounded-md border border-border bg-muted/40 p-2">
          <span className="text-sm font-medium">{selectedIds.size} selected</span>

          <Select onValueChange={handleBulkStageChange}>
            <SelectTrigger className="h-8 w-40"><SelectValue placeholder="Change stage" /></SelectTrigger>
            <SelectContent>
              {statuses.map((s) => (
                <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select onValueChange={handleBulkAssign}>
            <SelectTrigger className="h-8 w-40"><SelectValue placeholder="Assign to" /></SelectTrigger>
            <SelectContent>
              {owners.map((o) => (
                <SelectItem key={o.id} value={o.id}>{o.fullName}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button size="sm" variant="destructive">Delete</Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Delete {selectedIds.size} lead(s)?</AlertDialogTitle>
                <AlertDialogDescription>This can&apos;t be undone.</AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={handleBulkDelete}>Delete</AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>

          <Button size="sm" variant="ghost" onClick={() => setSelectedIds(new Set())}>
            Clear
          </Button>
        </div>
      )}

      {view === "list" && (
        <DataTable
          columns={columns}
          data={filteredLeads}
          getRowId={(row) => row.id}
          emptyMessage={isLoading ? "Loading..." : "No leads match your filters."}
        />
      )}

      {view === "kanban" && (
        <KanbanBoard
          leads={filteredLeads}
          statuses={statuses}
          owners={owners}
          onOpen={setDetailLeadId}
          onMoveLead={handleMoveLead}
        />
      )}

      {view === "analytics" && <LeadAnalytics leads={leads} statuses={statuses} />}

      <LeadDetailSheet
        lead={detailLead}
        activities={activities}
        notes={notes}
        statuses={statuses}
        owners={owners}
        open={!!detailLeadId}
        onOpenChange={(open) => !open && setDetailLeadId(null)}
        onEdit={(lead) => {
          setDetailLeadId(null);
          openEdit(lead);
        }}
        onAddActivity={handleAddActivity}
        onAddNote={handleAddNote}
        onUpdateNote={handleUpdateNote}
        onDeleteNote={handleDeleteNote}
      />
    </div>
  );
}
