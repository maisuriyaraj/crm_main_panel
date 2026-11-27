"use client";

import { useDraggable } from "@dnd-kit/core";

import { cn } from "@/lib/utils";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { CALL_STATUS_LABEL, hasNoName, leadDisplayName, resolveOwnerName, type Lead, type LeadOwner } from "@/lib/leads/types";

// The coloured call indicator (LD-A6): green answered, yellow a follow-up is
// pending, red not answered, grey never called.
const CALL_DOT: Record<Lead["lastCallStatus"], string> = {
  answered: "bg-chart-2",
  follow_up: "bg-chart-4",
  not_answered: "bg-destructive",
  none: "bg-muted-foreground",
};

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
  dragOverlay?: boolean;
}

export function KanbanCard({ lead, owners, onOpen, dragOverlay }: KanbanCardProps) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: lead.id,
    disabled: dragOverlay,
  });

  return (
    <Card
      ref={dragOverlay ? undefined : setNodeRef}
      {...(dragOverlay ? {} : listeners)}
      {...(dragOverlay ? {} : attributes)}
      onClick={() => onOpen(lead.id)}
      className={cn(
        "cursor-grab py-3 shadow-sm transition-shadow hover:shadow-md active:cursor-grabbing",
        isDragging && !dragOverlay && "touch-none opacity-0",
      )}
    >
      <CardContent className="space-y-2 px-3">
        <div className="flex items-start justify-between gap-2">
          <div>
            {/* A lead needs only one of a name, an email or a mobile, so some
                have no name; the card says so rather than showing nothing. */}
            <p className={cn("text-sm font-medium leading-tight", hasNoName(lead) && "font-normal text-muted-foreground")}>
              {leadDisplayName(lead)}
            </p>
            {lead.companyName && (
              <p className="truncate text-xs text-muted-foreground" title={lead.companyName}>
                {lead.companyName}
              </p>
            )}
          </div>
          <div className="mt-1 flex shrink-0 items-center gap-1">
            {lead.mobile && (
              <span
                className={cn("h-2 w-2 rounded-full", CALL_DOT[lead.lastCallStatus ?? "none"])}
                title={CALL_STATUS_LABEL[lead.lastCallStatus ?? "none"]}
              />
            )}
            <span
              className={cn("h-2 w-2 rounded-full", TEMPERATURE_DOT[lead.temperature])}
              title={`${lead.temperature} lead`}
            />
          </div>
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
