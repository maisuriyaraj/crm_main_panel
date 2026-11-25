"use client";

import { useMemo, useRef, useState } from "react";
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  useDroppable,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from "@dnd-kit/core";

import { MessageSquareWarning } from "lucide-react";

import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { KanbanCard } from "@/components/leads/kanban-card";
import { OUTCOME_LABEL, stageOutcome, type Lead, type LeadOwner, type LeadStage } from "@/lib/leads/types";

interface KanbanColumnProps {
  stage: LeadStage;
  leads: Lead[];
  owners: LeadOwner[];
  onOpen: (leadId: string) => void;
}

function KanbanColumn({ stage, leads, owners, onOpen }: KanbanColumnProps) {
  const { setNodeRef, isOver } = useDroppable({ id: stage.id });

  const totalValue = leads.reduce((sum, lead) => sum + (lead.value ?? 0), 0);
  // A stage that closes a lead, and one that asks for a reason first, both say
  // so on the column: the member sees it before they drag, not after.
  const outcome = stageOutcome(stage);

  return (
    <div className="flex w-72 shrink-0 flex-col rounded-lg border border-border bg-muted/30">
      <div className="flex items-center justify-between border-b border-border px-3 py-2">
        <div className="flex min-w-0 items-center gap-2">
          <span className="h-2 w-2 shrink-0 rounded-full" style={{ backgroundColor: stage.color }} />
          <span className="truncate text-sm font-medium">{stage.name}</span>
          <span className="text-xs text-muted-foreground">{leads.length}</span>
          {outcome && (
            <Badge variant={outcome === "won" ? "default" : "destructive"} className="shrink-0 text-[10px]">
              {OUTCOME_LABEL[outcome]}
            </Badge>
          )}
          {stage.requiresReason && (
            <span className="shrink-0 text-muted-foreground" title="Moving a lead here needs a reason">
              <MessageSquareWarning className="h-3.5 w-3.5" />
            </span>
          )}
        </div>
        {totalValue > 0 && (
          <span className="text-xs text-muted-foreground">₹{totalValue.toLocaleString("en-IN")}</span>
        )}
      </div>

      <div
        ref={setNodeRef}
        className={cn(
          "flex min-h-[120px] flex-1 flex-col gap-2 p-2 transition-colors",
          isOver && "bg-accent/50",
        )}
      >
        {leads.map((lead) => (
          <KanbanCard key={lead.id} lead={lead} owners={owners} onOpen={onOpen} />
        ))}
        {leads.length === 0 && (
          <p className="px-2 py-4 text-center text-xs text-muted-foreground">No leads in this stage</p>
        )}
      </div>
    </div>
  );
}

interface KanbanBoardProps {
  leads: Lead[];
  statuses: LeadStage[];
  owners: LeadOwner[];
  onOpen: (leadId: string) => void;
  // Absent when the user can't change stages: cards then don't drag.
  onMoveLead?: (leadId: string, newStatusId: string) => void;
}

export function KanbanBoard({ leads, statuses, owners, onOpen, onMoveLead }: KanbanBoardProps) {
  const [activeLead, setActiveLead] = useState<Lead | null>(null);
  const boardRef = useRef<HTMLDivElement>(null);
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }));
  const noSensors = useSensors();

  // dnd-kit auto-scrolls every scrollable ancestor by default, which drags the
  // whole page around. Restrict it to the board so only the columns scroll.
  // Memoized because the auto-scroller re-reads these options on every frame.
  const autoScroll = useMemo(
    () => ({ canScroll: (element: Element) => element === boardRef.current }),
    [],
  );

  const stages = [...statuses].sort((a, b) => a.sortOrder - b.sortOrder);

  const handleDragStart = (event: DragStartEvent) => {
    const lead = leads.find((l) => l.id === event.active.id);
    setActiveLead(lead ?? null);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    setActiveLead(null);
    const { active, over } = event;
    if (!over) return;

    const leadId = String(active.id);
    const newStatusId = String(over.id);
    const lead = leads.find((l) => l.id === leadId);
    if (lead && lead.statusId !== newStatusId) {
      onMoveLead?.(leadId, newStatusId);
    }
  };

  const handleDragCancel = () => setActiveLead(null);

  return (
      <DndContext
        sensors={onMoveLead ? sensors : noSensors}
        autoScroll={autoScroll}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
        onDragCancel={handleDragCancel}
      >
        <div ref={boardRef} className="flex gap-3 overflow-x-auto pb-4">
          {stages.map((stage) => (
            <KanbanColumn
              key={stage.id}
              stage={stage}
              leads={leads.filter((lead) => lead.statusId === stage.id)}
              owners={owners}
              onOpen={onOpen}
            />
          ))}
          <div aria-hidden className="w-4 shrink-0" />
        </div>

        <DragOverlay>
          {activeLead ? (
            <div className="w-72">
              <KanbanCard lead={activeLead} owners={owners} onOpen={() => { }} dragOverlay />
            </div>
          ) : null}
        </DragOverlay>
      </DndContext>
  );
}
