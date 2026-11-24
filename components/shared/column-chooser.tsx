"use client";

import * as React from "react";
import { ArrowDown, ArrowUp, Columns3, RotateCcw } from "lucide-react";

import type { ListColumnChoice } from "@/lib/lists/types";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { FieldHelp } from "@/components/shared/field-help";
import { ScrollArea } from "@/components/ui/scroll-area";

// Show, hide and reorder a list's columns (SRS SH-L3). Reordering is by the
// up/down buttons rather than drag: they work by keyboard and on a phone, where
// a drag inside a popover fights the scroll.
//
// The order of `columns` is the column order; `order` numbers are rewritten from
// the array position when the change is saved, so the two can never disagree.

interface ColumnChooserProps {
  columns: ListColumnChoice[];
  // Keys this screen can actually render. A key the API knows but this screen
  // does not is left out of the chooser instead of offering a blank column.
  renderable: string[];
  labels: Record<string, string>;
  onChange: (columns: ListColumnChoice[]) => void;
  onReset?: () => void;
  disabled?: boolean;
}

const move = (columns: ListColumnChoice[], from: number, to: number): ListColumnChoice[] => {
  if (to < 0 || to >= columns.length) return columns;
  const next = [...columns];
  const [item] = next.splice(from, 1);
  next.splice(to, 0, item);
  return next.map((column, index) => ({ ...column, order: index }));
};

export function ColumnChooser({ columns, renderable, labels, onChange, onReset, disabled }: ColumnChooserProps) {
  const known = new Set(renderable);
  const offered = columns.filter((column) => known.has(column.key));
  const shown = offered.filter((column) => column.visible).length;

  // An edit applies to the full stored order, so hiding a column this screen
  // cannot render (one saved by a newer version of the app) never drops it.
  const apply = (nextOffered: ListColumnChoice[]) => {
    const byKey = new Map(nextOffered.map((column) => [column.key, column]));
    const rest = columns.filter((column) => !known.has(column.key));
    onChange([...nextOffered.map((column) => byKey.get(column.key)!), ...rest].map((column, index) => ({ ...column, order: index })));
  };

  const toggle = (key: string, visible: boolean) => {
    // At least one column has to stay, or the table has nothing to show.
    if (!visible && shown <= 1) return;
    apply(offered.map((column) => (column.key === key ? { ...column, visible } : column)));
  };

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button type="button" variant="outline" size="sm" disabled={disabled}>
          <Columns3 className="h-4 w-4" />
          Columns
          <span className="ml-1 text-xs text-muted-foreground">
            {shown}/{offered.length}
          </span>
        </Button>
      </PopoverTrigger>

      <PopoverContent align="end" className="w-72 p-0">
        <div className="flex items-center justify-between border-b border-border px-3 py-2">
          <p className="text-sm font-medium">Columns</p>
          {onReset && (
            <Button type="button" variant="ghost" size="sm" onClick={onReset}>
              <RotateCcw className="h-3.5 w-3.5" />
              Reset
            </Button>
          )}
        </div>

        <ScrollArea className="max-h-80">
          <ul className="p-1">
            {offered.map((column, index) => (
              <li key={column.key} className="flex items-center gap-2 rounded-md px-2 py-1.5 hover:bg-muted/60">
                <Checkbox
                  id={`column-${column.key}`}
                  checked={column.visible}
                  onCheckedChange={(checked) => toggle(column.key, checked === true)}
                  aria-label={`Show ${labels[column.key] ?? column.key}`}
                />
                <label htmlFor={`column-${column.key}`} className="flex flex-1 cursor-pointer items-center gap-1 truncate text-sm">
                  <span className="truncate">{labels[column.key] ?? column.label ?? column.key}</span>
                  {/* The same ⓘ copy the header shows, so choosing a column does
                      not mean guessing what it holds. */}
                  <FieldHelp text={column.help} />
                </label>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6"
                  disabled={index === 0}
                  onClick={() => apply(move(offered, index, index - 1))}
                  aria-label={`Move ${labels[column.key] ?? column.key} up`}
                >
                  <ArrowUp className="h-3.5 w-3.5" />
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6"
                  disabled={index === offered.length - 1}
                  onClick={() => apply(move(offered, index, index + 1))}
                  aria-label={`Move ${labels[column.key] ?? column.key} down`}
                >
                  <ArrowDown className="h-3.5 w-3.5" />
                </Button>
              </li>
            ))}
          </ul>
        </ScrollArea>

        <p className="border-t border-border px-3 py-2 text-xs text-muted-foreground">
          Saved for you only, on this list.
        </p>
      </PopoverContent>
    </Popover>
  );
}
