"use client";

import { useMemo, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Plus } from "lucide-react";

import { notify } from "@/lib/commonFunctions";
import {
  DEMO_ACTIVITIES,
  DEMO_LEAD_STATUSES,
  DEMO_LEADS,
  DEMO_NOTES,
  DEMO_OWNERS,
  ownerName,
  type Lead,
  type LeadActivity,
  type LeadActivityType,
  type LeadNote,
} from "@/lib/leads/demo-data";
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

let demoIdCounter = 1000;
const nextId = (prefix: string) => `${prefix}${demoIdCounter++}`;
const nowIso = () => new Date().toISOString();
const toNumber = (value: string | undefined): number | undefined => {
  if (!value || value.trim() === "") return undefined;
  const parsed = Number(value);
  return Number.isNaN(parsed) ? undefined : parsed;
};

export default function LeadsPage() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const view = (searchParams.get("view") as ViewMode) || "list";

  const [leads, setLeads] = useState<Lead[]>(DEMO_LEADS);
  const [activities, setActivities] = useState<LeadActivity[]>(DEMO_ACTIVITIES);
  const [notes, setNotes] = useState<LeadNote[]>(DEMO_NOTES);

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

  const logStageChangeActivity = (lead: Lead, newStatusId: string) => {
    const fromName = DEMO_LEAD_STATUSES.find((s) => s.id === lead.statusId)?.name ?? "Unknown";
    const toName = DEMO_LEAD_STATUSES.find((s) => s.id === newStatusId)?.name ?? "Unknown";
    setActivities((prev) => [
      ...prev,
      {
        id: nextId("a"),
        leadId: lead.id,
        activityType: "note",
        subject: `Stage changed from ${fromName} to ${toName}`,
        createdBy: lead.assignedTo ?? DEMO_OWNERS[0].id,
        createdAt: nowIso(),
      },
    ]);
  };

  const handleFormSubmit = (values: LeadFormValues) => {
    if (formMode === "create") {
      const newLead: Lead = {
        id: nextId("l"),
        fullName: values.fullName,
        companyName: values.companyName || undefined,
        email: values.email || undefined,
        mobile: values.mobile || undefined,
        designation: values.designation || undefined,
        website: values.website || undefined,
        priority: values.priority,
        temperature: values.temperature,
        leadScore: toNumber(values.leadScore) ?? 0,
        value: toNumber(values.value),
        probability: toNumber(values.probability),
        description: values.description || undefined,
        statusId: values.statusId,
        assignedTo: values.assignedTo || undefined,
        tags: values.tags,
        createdAt: nowIso(),
        updatedAt: nowIso(),
      };
      setLeads((prev) => [newLead, ...prev]);
      notify("Lead created.", { type: "success" });
      return;
    }

    if (!editLead) return;
    if (editLead.statusId !== values.statusId) {
      logStageChangeActivity(editLead, values.statusId);
    }
    setLeads((prev) =>
      prev.map((lead) =>
        lead.id === editLead.id
          ? {
              ...lead,
              fullName: values.fullName,
              companyName: values.companyName || undefined,
              email: values.email || undefined,
              mobile: values.mobile || undefined,
              designation: values.designation || undefined,
              website: values.website || undefined,
              priority: values.priority,
              temperature: values.temperature,
              leadScore: toNumber(values.leadScore) ?? 0,
              value: toNumber(values.value),
              probability: toNumber(values.probability),
              description: values.description || undefined,
              statusId: values.statusId,
              assignedTo: values.assignedTo || undefined,
              tags: values.tags,
              updatedAt: nowIso(),
            }
          : lead,
      ),
    );
    notify("Lead updated.", { type: "success" });
  };

  const handleDelete = (id: string) => {
    setLeads((prev) => prev.filter((lead) => lead.id !== id));
    setSelectedIds((prev) => {
      const next = new Set(prev);
      next.delete(id);
      return next;
    });
    notify("Lead deleted.", { type: "success" });
  };

  const handleBulkDelete = () => {
    setLeads((prev) => prev.filter((lead) => !selectedIds.has(lead.id)));
    notify(`${selectedIds.size} lead(s) deleted.`, { type: "success" });
    setSelectedIds(new Set());
  };

  const handleBulkStageChange = (stageId: string) => {
    setLeads((prev) =>
      prev.map((lead) => (selectedIds.has(lead.id) ? { ...lead, statusId: stageId, updatedAt: nowIso() } : lead)),
    );
    notify(`Moved ${selectedIds.size} lead(s).`, { type: "success" });
    setSelectedIds(new Set());
  };

  const handleBulkAssign = (ownerId: string) => {
    setLeads((prev) =>
      prev.map((lead) => (selectedIds.has(lead.id) ? { ...lead, assignedTo: ownerId, updatedAt: nowIso() } : lead)),
    );
    notify(`Reassigned ${selectedIds.size} lead(s).`, { type: "success" });
    setSelectedIds(new Set());
  };

  const handleMoveLead = (leadId: string, newStatusId: string) => {
    setLeads((prev) =>
      prev.map((lead) => {
        if (lead.id !== leadId) return lead;
        logStageChangeActivity(lead, newStatusId);
        return { ...lead, statusId: newStatusId, updatedAt: nowIso() };
      }),
    );
  };

  const handleAddActivity = (
    leadId: string,
    values: { activityType: LeadActivityType; subject: string; description?: string },
  ) => {
    setActivities((prev) => [
      ...prev,
      { id: nextId("a"), leadId, createdBy: DEMO_OWNERS[0].id, createdAt: nowIso(), ...values },
    ]);
  };

  const handleAddNote = (leadId: string, note: string) => {
    const now = nowIso();
    setNotes((prev) => [...prev, { id: nextId("n"), leadId, note, createdBy: DEMO_OWNERS[0].id, createdAt: now, updatedAt: now }]);
  };

  const handleUpdateNote = (noteId: string, note: string) => {
    setNotes((prev) => prev.map((n) => (n.id === noteId ? { ...n, note, updatedAt: nowIso() } : n)));
  };

  const handleDeleteNote = (noteId: string) => {
    setNotes((prev) => prev.filter((n) => n.id !== noteId));
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
      accessor: (row) => DEMO_LEAD_STATUSES.find((s) => s.id === row.statusId)?.name ?? "",
      render: (row) => {
        const stage = DEMO_LEAD_STATUSES.find((s) => s.id === row.statusId);
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
      accessor: (row) => (row.assignedTo ? ownerName(row.assignedTo) : ""),
      render: (row) =>
        row.assignedTo ? ownerName(row.assignedTo) : <span className="text-muted-foreground">Unassigned</span>,
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
        </div>
      ),
    },
  ];

  const detailLead = leads.find((l) => l.id === detailLeadId) ?? null;
  const detailActivities = activities.filter((a) => a.leadId === detailLeadId);
  const detailNotes = notes.filter((n) => n.leadId === detailLeadId);

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
              {DEMO_LEAD_STATUSES.map((s) => (
                <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={ownerFilter} onValueChange={setOwnerFilter}>
            <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Owners</SelectItem>
              {DEMO_OWNERS.map((o) => (
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

      {selectedIds.size > 0 && view === "list" && (
        <div className="flex flex-wrap items-center gap-2 rounded-md border border-border bg-muted/40 p-2">
          <span className="text-sm font-medium">{selectedIds.size} selected</span>

          <Select onValueChange={handleBulkStageChange}>
            <SelectTrigger className="h-8 w-40"><SelectValue placeholder="Change stage" /></SelectTrigger>
            <SelectContent>
              {DEMO_LEAD_STATUSES.map((s) => (
                <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select onValueChange={handleBulkAssign}>
            <SelectTrigger className="h-8 w-40"><SelectValue placeholder="Assign to" /></SelectTrigger>
            <SelectContent>
              {DEMO_OWNERS.map((o) => (
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
          emptyMessage="No leads match your filters."
        />
      )}

      {view === "kanban" && (
        <KanbanBoard leads={filteredLeads} onOpen={setDetailLeadId} onMoveLead={handleMoveLead} />
      )}

      {view === "analytics" && <LeadAnalytics leads={leads} />}

      <LeadDetailSheet
        lead={detailLead}
        activities={detailActivities}
        notes={detailNotes}
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
