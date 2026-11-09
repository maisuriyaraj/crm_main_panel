"use client";

import { useState } from "react";
import { Copy, Download } from "lucide-react";

import { downloadRecoveryCodes, recoveryCodesText } from "@/lib/auth/mfa";
import { notify } from "@/lib/commonFunctions";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";

// The server shows these once and keeps only a hash, so this is the one chance to
// save them. They live in the parent's state until the user continues and are sent
// nowhere: copying uses the clipboard and the download is a file made in the browser.
export function RecoveryCodes({ codes, onContinue, continueLabel = "Continue" }: { codes: string[]; onContinue: () => void; continueLabel?: string }) {
  const [saved, setSaved] = useState(false);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(recoveryCodesText(codes));
      notify("Recovery codes copied", { type: "success" });
    } catch {
      notify("Couldn't copy. Select the codes and copy them yourself.", { type: "error" });
    }
  };

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        If you lose your phone, each of these codes signs you in once. <strong className="text-foreground">They won&apos;t be shown again.</strong>
      </p>
      <ol aria-label="Recovery codes" className="grid grid-cols-1 gap-1.5 rounded-xl border border-border bg-background p-4 font-mono text-sm sm:grid-cols-2">
        {codes.map((code) => (
          <li key={code} className="select-all">{code}</li>
        ))}
      </ol>
      <div className="flex gap-2">
        <Button type="button" variant="outline" className="flex-1" onClick={copy}>
          <Copy aria-hidden /> Copy
        </Button>
        <Button type="button" variant="outline" className="flex-1" onClick={() => downloadRecoveryCodes(codes)}>
          <Download aria-hidden /> Download
        </Button>
      </div>
      <div className="flex items-start gap-2">
        <Checkbox id="recovery-codes-saved" checked={saved} onCheckedChange={(value) => setSaved(value === true)} />
        <Label htmlFor="recovery-codes-saved" className="text-sm font-normal leading-snug">
          I&apos;ve saved these codes somewhere safe
        </Label>
      </div>
      <Button type="button" size="lg" className="w-full" disabled={!saved} onClick={onContinue}>
        {continueLabel}
      </Button>
    </div>
  );
}
