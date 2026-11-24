"use client";

import { useState } from "react";
import { ChevronDown, Download, FileSpreadsheet, FileText, Loader2 } from "lucide-react";

import { notify } from "@/lib/commonFunctions";
import { downloadExport, exportErrorMessage, type ExportFormat, type ExportParams } from "@/lib/exports";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface ExportButtonProps {
  path: string;
  params: ExportParams;
  // Without an extension: the format adds its own, and the server's own file
  // name wins anyway when it sends one.
  fileName: string;
  label?: string;
  // What is being exported, for the menu's own line of explanation: the ticked
  // rows, or everything the filters match.
  scopeLabel?: string;
}

// Downloads the current filtered list as CSV or as an Excel file. Render it only
// for members who hold the module's export permission; the API checks it again.
export function ExportButton({ path, params, fileName, label = "Export", scopeLabel }: ExportButtonProps) {
  const [busy, setBusy] = useState<ExportFormat | null>(null);

  const run = async (format: ExportFormat) => {
    setBusy(format);
    try {
      await downloadExport(path, params, fileName, format);
      notify("Export downloaded.", { type: "success" });
    } catch (error) {
      notify(exportErrorMessage(error), { type: "error" });
    } finally {
      setBusy(null);
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button type="button" variant="outline" disabled={busy !== null}>
          {busy ? <Loader2 className="animate-spin" /> : <Download />}
          {label}
          <ChevronDown className="h-4 w-4 opacity-60" />
        </Button>
      </DropdownMenuTrigger>

      <DropdownMenuContent align="end" className="w-56">
        {scopeLabel && (
          <>
            <DropdownMenuLabel className="text-xs font-normal text-muted-foreground">{scopeLabel}</DropdownMenuLabel>
            <DropdownMenuSeparator />
          </>
        )}
        <DropdownMenuItem onSelect={() => run("csv")} className="gap-2">
          <FileText className="h-4 w-4" />
          CSV (.csv)
        </DropdownMenuItem>
        <DropdownMenuItem onSelect={() => run("xlsx")} className="gap-2">
          <FileSpreadsheet className="h-4 w-4" />
          Excel (.xlsx)
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
