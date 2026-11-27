"use client";

import { useState } from "react";
import { RotateCcw } from "lucide-react";

import { apiErrorMessage } from "@/lib/auth/errors";
import { notify } from "@/lib/commonFunctions";
import { useAppDispatch, useAppSelector } from "@/lib/store/hooks";
import {
  reqToResetEmailTemplate,
  reqToSaveEmailTemplate,
  type EmailTemplate,
} from "@/lib/store/slices/billingSettingsSlice";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

// The three invoice emails, each editable on its own. A template that has never been
// edited shows the standard wording and has nothing to reset.
export function InvoiceEmailsTab({ canManage }: { canManage: boolean }) {
  const { templates, placeholders } = useAppSelector((state) => state.billingSettings);
  const [error, setError] = useState<string | null>(null);

  return (
    <div className="space-y-6">
      {error && (
        <Alert variant="destructive">
          <AlertTitle>Couldn&apos;t save</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <Card>
        <CardHeader>
          <CardTitle>What you can put in an email</CardTitle>
          <CardDescription>
            Each of these is replaced with the real value when the email is sent. Type them exactly as shown.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-3 sm:grid-cols-2">
          {placeholders.map((entry) => (
            <div key={entry.token} className="text-sm">
              <code className="rounded bg-muted px-1.5 py-0.5 font-mono text-xs">{entry.token}</code>
              <span className="ml-2 text-muted-foreground">{entry.describes}</span>
            </div>
          ))}
        </CardContent>
      </Card>

      {templates.map((template) => (
        <TemplateCard
          key={template.key}
          template={template}
          canManage={canManage}
          onError={setError}
        />
      ))}
    </div>
  );
}

function TemplateCard({
  template,
  canManage,
  onError,
}: {
  template: EmailTemplate;
  canManage: boolean;
  onError: (message: string | null) => void;
}) {
  const dispatch = useAppDispatch();
  const { isSaving } = useAppSelector((state) => state.billingSettings);
  const [subject, setSubject] = useState(template.subject);
  const [body, setBody] = useState(template.body);

  // A save or a reset answers with the stored wording, so the boxes follow it. Done
  // while rendering, which is how React asks for state to be reset from a changed prop.
  const [builtFrom, setBuiltFrom] = useState(template);
  if (builtFrom.subject !== template.subject || builtFrom.body !== template.body) {
    setBuiltFrom(template);
    setSubject(template.subject);
    setBody(template.body);
  }

  const changed = subject !== template.subject || body !== template.body;

  const save = async () => {
    onError(null);
    const action = await dispatch(reqToSaveEmailTemplate({
      data: { key: template.key, subject, body },
      onFailure: (failure) => onError(apiErrorMessage(failure, "Couldn't save that email.")),
    }));
    if (reqToSaveEmailTemplate.fulfilled.match(action)) {
      notify(`${template.label} saved.`, { type: "success" });
    }
  };

  const reset = async () => {
    onError(null);
    const action = await dispatch(reqToResetEmailTemplate({
      data: { key: template.key },
      onFailure: (failure) => onError(apiErrorMessage(failure, "Couldn't reset that email.")),
    }));
    if (reqToResetEmailTemplate.fulfilled.match(action)) {
      notify(`${template.label} is back to the standard wording.`, { type: "success" });
    }
  };

  return (
    <Card>
      <CardHeader className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <CardTitle className="flex flex-wrap items-center gap-2">
            {template.label}
            {template.customised ? <Badge variant="secondary">Your wording</Badge> : <Badge variant="outline">Standard wording</Badge>}
          </CardTitle>
          <CardDescription>{template.describes}</CardDescription>
        </div>
        {canManage && template.customised && (
          <Button variant="outline" onClick={reset} disabled={isSaving}>
            <RotateCcw className="size-4" aria-hidden /> Reset to standard
          </Button>
        )}
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor={`subject-${template.key}`}>Subject</Label>
          <Input
            id={`subject-${template.key}`}
            value={subject}
            disabled={!canManage || isSaving}
            onChange={(event) => setSubject(event.target.value)}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor={`body-${template.key}`}>Message</Label>
          <Textarea
            id={`body-${template.key}`}
            rows={10}
            value={body}
            disabled={!canManage || isSaving}
            onChange={(event) => setBody(event.target.value)}
          />
        </div>
        {canManage && (
          <div className="flex flex-wrap justify-end gap-2">
            {changed && (
              <Button variant="outline" onClick={() => { setSubject(template.subject); setBody(template.body); }} disabled={isSaving}>
                Undo changes
              </Button>
            )}
            <Button onClick={save} disabled={isSaving || !changed || subject.trim() === "" || body.trim() === ""}>
              {isSaving ? "Saving…" : "Save this email"}
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
