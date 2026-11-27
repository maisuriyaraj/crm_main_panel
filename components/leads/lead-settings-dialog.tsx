"use client";

import { useEffect, useState } from "react";
import { Check, Pencil, Plus, Trash2, X } from "lucide-react";

import { notify } from "@/lib/commonFunctions";
import { apiErrorCode, apiErrorMessage } from "@/lib/auth/errors";
import { useAppDispatch, useAppSelector } from "@/lib/store/hooks";
import {
  reqToCreateLeadChannel,
  reqToCreateLeadCustomField,
  reqToCreateLeadSource,
  reqToDeleteLeadChannel,
  reqToDeleteLeadCustomField,
  reqToDeleteLeadSource,
  reqToGetLeadChannels,
  reqToGetLeadCustomFields,
  reqToGetLeadSources,
  reqToUpdateLeadChannel,
  reqToUpdateLeadCustomField,
  reqToUpdateLeadSource,
} from "@/lib/store/slices/leadsSlice";
import {
  CUSTOM_FIELD_TYPE_LABEL,
  type LeadCustomFieldDefinition,
  type LeadCustomFieldType,
  type LeadPicklistEntry,
} from "@/lib/leads/types";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

// Where a tenant shapes its own lead lists: the sources leads come from, the
// channels contact happens over, and the extra fields it wants on every lead.
// All three need the same permission as the pipeline, because they are the same
// kind of decision — what shape this organization's leads take.
//
// Switching an entry off and removing it are deliberately different buttons.
// Switching off keeps it on the leads that already carry it and only hides it
// from new ones; removing is refused outright while any lead still uses it,
// because a lead that came from an event still came from it.

// A key is suggested from the label so nobody has to invent one, but stays
// editable — and fixed once the field exists, because every stored value is
// keyed by it.
const keyFromLabel = (label: string) =>
  label
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .replace(/^(\d)/, "f$1")
    .slice(0, 64);

interface LeadSettingsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  // Called after anything changes, so the screen reloads the lists its form and
  // its filters read.
  onChanged: () => void;
}

export function LeadSettingsDialog({ open, onOpenChange, onChanged }: LeadSettingsDialogProps) {
  const dispatch = useAppDispatch();
  const sources = useAppSelector((state) => state.leads.sources);
  const channels = useAppSelector((state) => state.leads.channels);
  const customFields = useAppSelector((state) => state.leads.customFields);
  const busy = useAppSelector((state) => state.leads.picklistsLoading);

  // Every tab here edits the lists, so it asks for the switched-off entries too.
  const reload = () => {
    dispatch(reqToGetLeadSources({ data: { include_inactive: true } }));
    dispatch(reqToGetLeadChannels({ data: { include_inactive: true } }));
    dispatch(reqToGetLeadCustomFields({ data: { include_inactive: true } }));
  };

  useEffect(() => {
    if (!open) return;
    reload();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const afterChange = () => {
    reload();
    onChanged();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Lead settings</DialogTitle>
          <DialogDescription>
            The lists your lead form offers, and the extra fields you want on every lead.
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="sources">
          <TabsList className="w-full">
            <TabsTrigger value="sources" className="flex-1">Sources</TabsTrigger>
            <TabsTrigger value="channels" className="flex-1">Channels</TabsTrigger>
            <TabsTrigger value="fields" className="flex-1">Custom fields</TabsTrigger>
          </TabsList>

          <TabsContent value="sources">
            <PicklistTab
              kind="source"
              entries={sources}
              busy={busy}
              onChanged={afterChange}
              hint="Where a lead came from — an event, a campaign, a form, a referral, or typed in by hand. Leads from your connected integrations add themselves to this list."
            />
          </TabsContent>

          <TabsContent value="channels">
            <PicklistTab
              kind="channel"
              entries={channels}
              busy={busy}
              onChanged={afterChange}
              hint="How contact with a lead happens — phone, WhatsApp, walk-in. A lead from a website form may still be worked entirely over WhatsApp, which is why this is a separate list from the source."
            />
          </TabsContent>

          <TabsContent value="fields">
            <CustomFieldsTab definitions={customFields} busy={busy} onChanged={afterChange} />
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}

// ─── Sources and channels ────────────────────────────────────────────────────

interface PicklistTabProps {
  kind: "source" | "channel";
  entries: LeadPicklistEntry[];
  busy: boolean;
  hint: string;
  onChanged: () => void;
}

function PicklistTab({ kind, entries, busy, hint, onChanged }: PicklistTabProps) {
  const dispatch = useAppDispatch();
  const [newName, setNewName] = useState("");
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState("");
  const [toRemove, setToRemove] = useState<LeadPicklistEntry | null>(null);
  // The API's refusal when leads still point at the entry, kept so the member
  // reads why instead of a toast that disappears.
  const [inUse, setInUse] = useState<string | null>(null);

  const thunks =
    kind === "source"
      ? { create: reqToCreateLeadSource, update: reqToUpdateLeadSource, remove: reqToDeleteLeadSource }
      : { create: reqToCreateLeadChannel, update: reqToUpdateLeadChannel, remove: reqToDeleteLeadChannel };

  const failed = (fallback: string) => (error: unknown) =>
    notify(apiErrorMessage(error, fallback), { type: "error" });

  const add = () => {
    const name = newName.trim();
    if (!name) return;
    dispatch(
      thunks.create({
        data: { name },
        onSuccess: () => {
          setNewName("");
          notify(`${name} added.`, { type: "success" });
          onChanged();
        },
        onFailure: failed(`Couldn't add this ${kind}. Please try again.`),
      }),
    );
  };

  const rename = (entry: LeadPicklistEntry) => {
    const name = renameValue.trim();
    if (!name || name === entry.name) {
      setRenamingId(null);
      return;
    }
    dispatch(
      thunks.update({
        data: { id: entry.id, name },
        onSuccess: () => {
          setRenamingId(null);
          onChanged();
        },
        onFailure: failed(`Couldn't rename this ${kind}. Please try again.`),
      }),
    );
  };

  const setActive = (entry: LeadPicklistEntry, isActive: boolean) => {
    dispatch(
      thunks.update({
        data: { id: entry.id, is_active: isActive },
        onSuccess: onChanged,
        onFailure: failed(`Couldn't change this ${kind}. Please try again.`),
      }),
    );
  };

  const remove = (entry: LeadPicklistEntry) => {
    dispatch(
      thunks.remove({
        data: { id: entry.id },
        onSuccess: () => {
          setToRemove(null);
          notify(`${entry.name} removed.`, { type: "success" });
          onChanged();
        },
        onFailure: (error: unknown) => {
          setToRemove(null);
          const code = apiErrorCode(error);
          if (code === "SOURCE_IN_USE" || code === "CHANNEL_IN_USE") {
            setInUse(apiErrorMessage(error, `Some leads still use this ${kind}.`));
            return;
          }
          failed(`Couldn't remove this ${kind}. Please try again.`)(error);
        },
      }),
    );
  };

  return (
    <div className="space-y-3">
      <p className="text-sm text-muted-foreground">{hint}</p>

      <div className="flex gap-2">
        <Input
          value={newName}
          onChange={(event) => setNewName(event.target.value)}
          placeholder={kind === "source" ? "Exhibitor event leads" : "WhatsApp"}
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              event.preventDefault();
              add();
            }
          }}
        />
        <Button onClick={add} disabled={busy || !newName.trim()}>
          <Plus className="h-4 w-4" /> Add
        </Button>
      </div>

      {inUse && (
        <div className="rounded-md border border-destructive/50 bg-destructive/5 p-3 text-sm">
          <p>{inUse}</p>
          <Button variant="ghost" size="sm" className="mt-1 px-0" onClick={() => setInUse(null)}>
            Got it
          </Button>
        </div>
      )}

      <ul className="divide-y divide-border rounded-md border border-border">
        {entries.map((entry) => (
          <li key={entry.id} className="flex items-center gap-2 p-2">
            {renamingId === entry.id ? (
              <>
                <Input
                  value={renameValue}
                  onChange={(event) => setRenameValue(event.target.value)}
                  className="h-8 flex-1"
                  autoFocus
                />
                <Button size="icon" variant="ghost" className="h-8 w-8" aria-label="Save name" onClick={() => rename(entry)}>
                  <Check className="h-4 w-4" />
                </Button>
                <Button size="icon" variant="ghost" className="h-8 w-8" aria-label="Cancel" onClick={() => setRenamingId(null)}>
                  <X className="h-4 w-4" />
                </Button>
              </>
            ) : (
              <>
                <span className="flex-1 text-sm">{entry.name}</span>
                {!entry.isActive && <Badge variant="outline" className="text-xs">Switched off</Badge>}
                <div className="flex items-center gap-1" title="Switched off, it stays on the leads that already use it but is no longer offered on new ones.">
                  <Switch
                    checked={entry.isActive}
                    onCheckedChange={(checked) => setActive(entry, checked)}
                    aria-label={`Offer ${entry.name} on new leads`}
                  />
                </div>
                <Button
                  size="icon"
                  variant="ghost"
                  className="h-8 w-8"
                  aria-label={`Rename ${entry.name}`}
                  onClick={() => {
                    setRenamingId(entry.id);
                    setRenameValue(entry.name);
                  }}
                >
                  <Pencil className="h-3.5 w-3.5" />
                </Button>
                <Button
                  size="icon"
                  variant="ghost"
                  className="h-8 w-8"
                  aria-label={`Remove ${entry.name}`}
                  onClick={() => setToRemove(entry)}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </>
            )}
          </li>
        ))}
        {entries.length === 0 && (
          <li className="p-3 text-sm text-muted-foreground">Nothing here yet. Add the first one above.</li>
        )}
      </ul>

      <AlertDialog open={!!toRemove} onOpenChange={(next) => !next && setToRemove(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove {toRemove?.name}?</AlertDialogTitle>
            <AlertDialogDescription>
              It will no longer be offered anywhere. If any lead still uses it, nothing is removed and you can switch it
              off instead.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => toRemove && remove(toRemove)}>Remove</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

// ─── Tenant-defined lead fields ──────────────────────────────────────────────

const FIELD_TYPES: LeadCustomFieldType[] = ["text", "number", "date", "picklist", "checkbox"];

function CustomFieldsTab({
  definitions,
  busy,
  onChanged,
}: {
  definitions: LeadCustomFieldDefinition[];
  busy: boolean;
  onChanged: () => void;
}) {
  const dispatch = useAppDispatch();
  const [label, setLabel] = useState("");
  const [key, setKey] = useState("");
  const [keyEdited, setKeyEdited] = useState(false);
  const [fieldType, setFieldType] = useState<LeadCustomFieldType>("text");
  const [optionsText, setOptionsText] = useState("");
  const [isRequired, setIsRequired] = useState(false);
  const [toRemove, setToRemove] = useState<LeadCustomFieldDefinition | null>(null);

  const failed = (fallback: string) => (error: unknown) =>
    notify(apiErrorMessage(error, fallback), { type: "error" });

  const reset = () => {
    setLabel("");
    setKey("");
    setKeyEdited(false);
    setFieldType("text");
    setOptionsText("");
    setIsRequired(false);
  };

  const add = () => {
    const options = optionsText
      .split("\n")
      .map((option) => option.trim())
      .filter(Boolean);

    if (fieldType === "picklist" && options.length === 0) {
      notify("A choice list needs at least one choice, one per line.", { type: "error" });
      return;
    }

    dispatch(
      reqToCreateLeadCustomField({
        data: {
          key: key.trim() || keyFromLabel(label),
          label: label.trim(),
          field_type: fieldType,
          is_required: isRequired,
          ...(fieldType === "picklist" ? { options } : {}),
        },
        onSuccess: () => {
          notify(`${label.trim()} added.`, { type: "success" });
          reset();
          onChanged();
        },
        onFailure: failed("Couldn't add this field. Please try again."),
      }),
    );
  };

  const setActive = (definition: LeadCustomFieldDefinition, active: boolean) => {
    dispatch(
      reqToUpdateLeadCustomField({
        data: { id: definition.id, active },
        onSuccess: onChanged,
        onFailure: failed("Couldn't change this field. Please try again."),
      }),
    );
  };

  const setRequired = (definition: LeadCustomFieldDefinition, required: boolean) => {
    dispatch(
      reqToUpdateLeadCustomField({
        data: { id: definition.id, is_required: required },
        onSuccess: onChanged,
        onFailure: failed("Couldn't change this field. Please try again."),
      }),
    );
  };

  const remove = (definition: LeadCustomFieldDefinition) => {
    dispatch(
      reqToDeleteLeadCustomField({
        data: { id: definition.id },
        onSuccess: (response: any) => {
          const removed = response?.data?.values_removed ?? 0;
          notify(
            removed > 0
              ? `${definition.label} removed, along with the ${removed} value(s) saved for it.`
              : `${definition.label} removed.`,
            { type: "success" },
          );
          setToRemove(null);
          onChanged();
        },
        onFailure: (error: unknown) => {
          setToRemove(null);
          failed("Couldn't remove this field. Please try again.")(error);
        },
      }),
    );
  };

  return (
    <div className="space-y-3">
      <p className="text-sm text-muted-foreground">
        Extra fields on every lead in your organization. A field&apos;s key and its type are fixed once it exists,
        because every value saved for it is stored under them.
      </p>

      <div className="space-y-3 rounded-md border border-border p-3">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div className="space-y-1">
            <Label htmlFor="cf-label">Label</Label>
            <Input
              id="cf-label"
              value={label}
              onChange={(event) => {
                setLabel(event.target.value);
                if (!keyEdited) setKey(keyFromLabel(event.target.value));
              }}
              placeholder="Industry"
            />
          </div>

          <div className="space-y-1">
            <Label htmlFor="cf-key">Key</Label>
            <Input
              id="cf-key"
              value={key}
              onChange={(event) => {
                setKeyEdited(true);
                setKey(event.target.value);
              }}
              placeholder="industry"
            />
          </div>

          <div className="space-y-1">
            <Label>Type</Label>
            <Select value={fieldType} onValueChange={(next) => setFieldType(next as LeadCustomFieldType)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {FIELD_TYPES.map((type) => (
                  <SelectItem key={type} value={type}>{CUSTOM_FIELD_TYPE_LABEL[type]}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center gap-2 pt-6">
            <Switch checked={isRequired} onCheckedChange={setIsRequired} id="cf-required" />
            <Label htmlFor="cf-required" className="font-normal">Required on new leads</Label>
          </div>

          {fieldType === "picklist" && (
            <div className="space-y-1 sm:col-span-2">
              <Label htmlFor="cf-options">Choices, one per line</Label>
              <Textarea
                id="cf-options"
                value={optionsText}
                onChange={(event) => setOptionsText(event.target.value)}
                rows={4}
              />
            </div>
          )}
        </div>

        <Button onClick={add} disabled={busy || !label.trim() || !key.trim()}>
          <Plus className="h-4 w-4" /> Add field
        </Button>
      </div>

      <ul className="divide-y divide-border rounded-md border border-border">
        {definitions.map((definition) => (
          <li key={definition.id} className="space-y-1 p-2">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-sm font-medium">{definition.label}</span>
              <Badge variant="secondary" className="text-xs">{CUSTOM_FIELD_TYPE_LABEL[definition.fieldType]}</Badge>
              <code className="text-xs text-muted-foreground">{definition.key}</code>
              {!definition.active && <Badge variant="outline" className="text-xs">Switched off</Badge>}

              <div className="ml-auto flex items-center gap-2">
                <Label className="flex items-center gap-1 text-xs font-normal text-muted-foreground">
                  Required
                  <Switch
                    checked={definition.isRequired}
                    onCheckedChange={(checked) => setRequired(definition, checked)}
                    aria-label={`Make ${definition.label} required`}
                  />
                </Label>
                <Label className="flex items-center gap-1 text-xs font-normal text-muted-foreground">
                  On
                  <Switch
                    checked={definition.active}
                    onCheckedChange={(checked) => setActive(definition, checked)}
                    aria-label={`Ask for ${definition.label} on leads`}
                  />
                </Label>
                <Button
                  size="icon"
                  variant="ghost"
                  className="h-8 w-8"
                  aria-label={`Remove ${definition.label}`}
                  onClick={() => setToRemove(definition)}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>
            {definition.options.length > 0 && (
              <p className="text-xs text-muted-foreground">Choices: {definition.options.join(", ")}</p>
            )}
          </li>
        ))}
        {definitions.length === 0 && (
          <li className="p-3 text-sm text-muted-foreground">No extra fields yet. Add the first one above.</li>
        )}
      </ul>

      <AlertDialog open={!!toRemove} onOpenChange={(next) => !next && setToRemove(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove {toRemove?.label}?</AlertDialogTitle>
            <AlertDialogDescription>
              Everything anyone has typed into this field, on every lead, goes with it. To stop asking for it while
              keeping those values, switch it off instead.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => toRemove && remove(toRemove)}>Remove</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
