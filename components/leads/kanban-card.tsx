"use client";

import { useDraggable } from "@dnd-kit/core";
import { CSS } from "@dnd-kit/utilities";

import { cn } from "@/lib/utils";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { resolveOwnerName, type Lead, type LeadOwner } from "@/lib/leads/types";

const TEMPERATURE_DOT: Record<Lead["temperature"], string> = {
  hot: "bg-destructive",
  warm: "bg-chart-4",
  cold: "bg-chart-2",
};

const initials = (name: string) =>
  name
    .split(" ")
    .map((part) => part[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

interface KanbanCardProps {
  lead: Lead;
  owners: LeadOwner[];
  onOpen: (leadId: string) => void;
}

export function KanbanCard({ lead, owners, onOpen }: KanbanCardProps) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: lead.id,
  });

  const style = transform
    ? { transform: CSS.Translate.toString(transform), zIndex: isDragging ? 10 : undefined }
    : undefined;

  return (
    <Card
      ref={setNodeRef}
      style={style}
      {...listeners}
      {...attributes}
      onClick={() => onOpen(lead.id)}
      className={cn(
        "cursor-grab touch-none py-3 shadow-sm transition-shadow hover:shadow-md active:cursor-grabbing",
        isDragging && "opacity-50",
      )}
    >
      <CardContent className="space-y-2 px-3">
        <div className="flex items-start justify-between gap-2">
          <div>
            <p className="text-sm font-medium leading-tight">{lead.fullName}</p>
            {lead.companyName && (
              <p className="text-xs text-muted-foreground">{lead.companyName}</p>
            )}
          </div>
          <span
            className={cn("mt-1 h-2 w-2 shrink-0 rounded-full", TEMPERATURE_DOT[lead.temperature])}
            title={`${lead.temperature} lead`}
          />
        </div>

        {typeof lead.value === "number" && (
          <p className="text-sm font-semibold">₹{lead.value.toLocaleString("en-IN")}</p>
        )}

        <div className="flex items-center justify-between">
          <div className="flex flex-wrap gap-1">
            {lead.tags.slice(0, 2).map((tag) => (
              <Badge key={tag} variant="outline" className="px-1.5 py-0 text-[10px]">
                {tag}
              </Badge>
            ))}
          </div>

          {lead.assignedTo && (
            <Avatar className="h-6 w-6">
              <AvatarFallback className="text-[10px]">
                {initials(resolveOwnerName(owners, lead.assignedTo))}
              </AvatarFallback>
            </Avatar>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
