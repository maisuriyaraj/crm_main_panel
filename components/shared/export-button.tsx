"use client";

import { useState } from "react";
import { Download, Loader2 } from "lucide-react";

import { notify } from "@/lib/commonFunctions";
import { downloadExport, exportErrorMessage, type ExportParams } from "@/lib/exports";
import { Button } from "@/components/ui/button";

interface ExportButtonProps {
  path: string;
  params: ExportParams;
  fileName: string;
  label?: string;
}

// Downloads the current filtered list as CSV. Render it only for members who
// hold the module's export permission; the API checks it again.
export function ExportButton({ path, params, fileName, label = "Export CSV" }: ExportButtonProps) {
  const [busy, setBusy] = useState(false);

  const run = async () => {
    setBusy(true);
    try {
      await downloadExport(path, params, fileName);
      notify("Export downloaded.", { type: "success" });
    } catch (error) {
      notify(exportErrorMessage(error), { type: "error" });
    } finally {
      setBusy(false);
    }
  };

  return (
    <Button type="button" variant="outline" onClick={run} disabled={busy}>
      {busy ? <Loader2 className="animate-spin" /> : <Download />}
      {label}
    </Button>
  );
}
