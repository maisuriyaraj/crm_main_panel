"use client";

import * as React from "react";
import { Info } from "lucide-react";

import { cn } from "@/lib/utils";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

// The ⓘ next to a field or column whose meaning is not obvious (SRS SH-L8).
// It is focusable, so the help is reachable by keyboard and not only on hover.
export function FieldHelp({ text, className }: { text?: string; className?: string }) {
  if (!text) return null;

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <button
            type="button"
            // Stops a header's sort button from firing when the icon is clicked.
            onClick={(event) => event.stopPropagation()}
            aria-label="What this field means"
            className={cn("inline-flex text-muted-foreground hover:text-foreground", className)}
          >
            <Info className="h-3.5 w-3.5" />
          </button>
        </TooltipTrigger>
        <TooltipContent className="max-w-xs text-wrap">{text}</TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

// A cell value that may be cut off by its column. The full value is always in
// the tooltip, so a truncated company name or email can still be read without
// opening the record.
export function Truncated({
  value,
  className,
  width = "max-w-[14rem]",
  children,
}: {
  value?: string | null;
  className?: string;
  // A Tailwind max-width utility; the cell truncates at whatever this allows.
  width?: string;
  children?: React.ReactNode;
}) {
  const text = value ?? "";
  if (!text) return <span className="text-muted-foreground">—</span>;

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <span className={cn("block truncate", width, className)}>{children ?? text}</span>
        </TooltipTrigger>
        <TooltipContent className="max-w-sm text-wrap break-words">{text}</TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
