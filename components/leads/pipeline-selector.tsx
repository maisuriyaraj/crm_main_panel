"use client";

import { Pencil } from "lucide-react";

import type { Pipeline } from "@/lib/leads/types";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

interface PipelineSelectorProps {
  pipelines: Pipeline[];
  value: string | null;
  onChange: (pipelineId: string) => void;
  // Absent without leads.pipeline.manage: the pencil is then not shown at all.
  onEdit?: () => void;
}

// Which board the Leads screen is showing: the first control in the toolbar,
// because it governs everything to its right — the stages, the filters, the
// list, the board and the export all belong to the pipeline chosen here.
//
// One pipeline is the whole product for most tenants, so the dropdown only
// earns its space at two or more; below that the name is shown as plain text.
// The pencil stays either way, because making the first extra one is what it
// is for.
export function PipelineSelector({ pipelines, value, onChange, onEdit }: PipelineSelectorProps) {
  const current = pipelines.find((pipeline) => pipeline.id === value) ?? pipelines[0] ?? null;

  const pencil = onEdit ? (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={onEdit} aria-label="Edit pipelines and stages">
            <Pencil className="h-3.5 w-3.5" />
          </Button>
        </TooltipTrigger>
        <TooltipContent>Edit pipelines and stages</TooltipContent>
      </Tooltip>
    </TooltipProvider>
  ) : null;

  // Nothing to choose between yet. Offering the pencil as a labelled button is
  // the only way a member with permission reaches the settings from here.
  if (!pipelines.length) {
    return onEdit ? (
      <Button variant="outline" size="sm" onClick={onEdit}>
        <Pencil className="h-3.5 w-3.5" /> Set up pipelines
      </Button>
    ) : null;
  }

  return (
    <div className="flex items-center gap-2">
      <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Pipeline</span>

      {pipelines.length > 1 ? (
        <Select value={value ?? undefined} onValueChange={onChange}>
          <SelectTrigger className="w-48" aria-label="Pipeline">
            <SelectValue placeholder="Choose a pipeline" />
          </SelectTrigger>
          <SelectContent>
            {pipelines.map((pipeline) => (
              <SelectItem key={pipeline.id} value={pipeline.id}>
                {pipeline.name}
                {pipeline.isDefault && <span className="ml-2 text-xs text-muted-foreground">Default</span>}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      ) : (
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium">{current?.name}</span>
          {current?.isDefault && <Badge variant="secondary" className="text-[10px]">Default</Badge>}
        </div>
      )}

      {pencil}
    </div>
  );
}
