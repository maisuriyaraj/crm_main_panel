"use client";

import { useState } from "react";
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

import { cn } from "@/lib/utils";
import { KanbanCard } from "@/components/leads/kanban-card";
import { DEMO_LEAD_STATUSES, type Lead } from "@/lib/leads/demo-data";

interface KanbanColumnProps {
  stageId: string;
  name: string;
  color: string;
  leads: Lead[];
  onOpen: (leadId: string) => void;
}

function KanbanColumn({ stageId, name, color, leads, onOpen }: KanbanColumnProps) {
  const { setNodeRef, isOver } = useDroppable({ id: stageId });

  const totalValue = leads.reduce((sum, lead) => sum + (lead.value ?? 0), 0);

  return (
    <div className="flex w-72 shrink-0 flex-col rounded-lg border border-border bg-muted/30">
      <div className="flex items-center justify-between border-b border-border px-3 py-2">
        <div className="flex items-center gap-2">
          <span className="h-2 w-2 rounded-full" style={{ backgroundColor: color }} />
          <span className="text-sm font-medium">{name}</span>
          <span className="text-xs text-muted-foreground">{leads.length}</span>
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
          <KanbanCard key={lead.id} lead={lead} onOpen={onOpen} />
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
  onOpen: (leadId: string) => void;
  onMoveLead: (leadId: string, newStatusId: string) => void;
}

export function KanbanBoard({ leads, onOpen, onMoveLead }: KanbanBoardProps) {
  const [activeLead, setActiveLead] = useState<Lead | null>(null);
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }));

  const stages = [...DEMO_LEAD_STATUSES].sort((a, b) => a.sortOrder - b.sortOrder);

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
      onMoveLead(leadId, newStatusId);
    }
  };

  return (
    <DndContext sensors={sensors} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
      <div className="flex gap-3 overflow-x-auto pb-4">
        {stages.map((stage) => (
          <KanbanColumn
            key={stage.id}
            stageId={stage.id}
            name={stage.name}
            color={stage.color}
            leads={leads.filter((lead) => lead.statusId === stage.id)}
            onOpen={onOpen}
          />
        ))}
      </div>

      <DragOverlay>
        {activeLead ? (
          <div className="w-72">
            <KanbanCard lead={activeLead} onOpen={() => {}} />
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}
