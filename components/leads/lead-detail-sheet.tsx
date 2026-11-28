"use client";

import { useState } from "react";
import { formatDistanceToNow } from "date-fns";
import { Building, Loader2, Pencil, Trash2, UserCheck } from "lucide-react";

import {
  CALL_STATUS_LABEL,
  LIFECYCLE_LABEL,
  OUTCOME_LABEL,
  hasNoName,
  leadDisplayName,
  resolveOwnerName,
  stageOutcome,
  type Lead,
  type LeadActivity,
  type LeadActivityType,
  type LeadCallStatus,
  type LeadCustomFieldDefinition,
  type LeadNote,
  type LeadOwner,
  type LeadStage,
} from "@/lib/leads/types";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Truncated } from "@/components/shared/field-help";
import { LeadAttachments } from "@/components/leads/lead-attachments";

const ACTIVITY_TYPES: LeadActivityType[] = ["call", "email", "meeting", "note", "whatsapp", "sms", "demo"];

// The outcomes a call can be logged with. "Never called" is not one of them: it
// is what a lead reads before anyone has called it, not something to record.
const CALL_OUTCOMES: Exclude<LeadCallStatus, "none">[] = ["answered", "not_answered", "follow_up"];

const DATE_TIME = { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" } as const;

const asDate = (value?: string) => (value ? new Date(value).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }) : null);
const asMoment = (value?: string) => (value ? new Date(value).toLocaleString("en-IN", DATE_TIME) : null);

// One lead's value for a tenant-defined field, read as the kind of thing that
// field holds, so a yes/no reads "Yes" and not "true".
const customValueText = (definition: LeadCustomFieldDefinition, value: unknown): string => {
  if (definition.fieldType === "checkbox") return value === true ? "Yes" : "No";
  if (value === null || value === undefined || value === "") return "—";
  if (definition.fieldType === "date") return asDate(String(value)) ?? "—";
  return String(value);
};

interface LeadDetailSheetProps {
  lead: Lead | null;
  activities: LeadActivity[];
  notes: LeadNote[];
  statuses: LeadStage[];
  owners: LeadOwner[];
  // The organization's own fields, so the values on the lead can be labelled.
  customFields?: LeadCustomFieldDefinition[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
  // Every write is optional: the caller passes only what the user's
  // permissions allow, and each control is hidden when its handler is absent.
  onEdit?: (lead: Lead) => void;
  onAddActivity?: (
    leadId: string,
    values: { activityType: LeadActivityType; subject: string; description?: string; callStatus?: LeadCallStatus },
  ) => void;
  onAddNote?: (leadId: string, note: string) => void;
  onUpdateNote?: (noteId: string, note: string) => void;
  onDeleteNote?: (noteId: string) => void;
  onConvert?: (lead: Lead) => void;
  // SRS 5.5 (LD-A7): turn this lead into a client of the Billing module.
  // Absent unless the member may manage clients and billing is on for the
  // organization, so the button never offers what the API would refuse.
  onConvertToClient?: (lead: Lead) => void;
  // True while that request is in flight, so the button cannot be pressed
  // twice: a second client for one lead is refused, which reads as an error
  // for something the member did not mean to do.
  convertingToClient?: boolean;
  // Absent when the storage feature is off for the organization: the tab is hidden.
  attachments?: { canUpload: boolean; canDelete: boolean };
}

export function LeadDetailSheet({
  lead,
  activities,
  notes,
  statuses,
  owners,
  customFields = [],
  open,
  onOpenChange,
  onEdit,
  onAddActivity,
  onAddNote,
  onUpdateNote,
  onDeleteNote,
  onConvert,
  onConvertToClient,
  convertingToClient = false,
  attachments,
}: LeadDetailSheetProps) {
  const [activityType, setActivityType] = useState<LeadActivityType>("call");
  const [activitySubject, setActivitySubject] = useState("");
  const [activityDescription, setActivityDescription] = useState("");
  // Only a call carries an outcome, which is also what sets the lead's last
  // call status; anything else is logged without one.
  const [callStatus, setCallStatus] = useState<LeadCallStatus>("answered");

  const [draftNote, setDraftNote] = useState("");
  const [editingNoteId, setEditingNoteId] = useState<string | null>(null);
  const [editingNoteText, setEditingNoteText] = useState("");

  if (!lead) return null;

  const stage = statuses.find((s) => s.id === lead.statusId);
  const outcome = stageOutcome(stage);

  const handleLogActivity = () => {
    if (!activitySubject.trim() || !onAddActivity) return;
    onAddActivity(lead.id, {
      activityType,
      subject: activitySubject.trim(),
      description: activityDescription.trim() || undefined,
      // The API refuses an outcome on anything but a call, so it only rides
      // along with one.
      callStatus: activityType === "call" ? callStatus : undefined,
    });
    setActivitySubject("");
    setActivityDescription("");
  };

  const handleAddNote = () => {
    if (!draftNote.trim() || !onAddNote) return;
    onAddNote(lead.id, draftNote.trim());
    setDraftNote("");
  };

  const sortedActivities = [...activities].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
  );
  const sortedNotes = [...notes].sort(
    (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime(),
  );

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full overflow-y-auto sm:max-w-lg">
        <SheetHeader>
          {/* A lead needs only one of a name, an email or a mobile, so some
              have no name at all. Saying so beats showing an email as a name. */}
          <SheetTitle className={cn(hasNoName(lead) && "text-muted-foreground")}>{leadDisplayName(lead)}</SheetTitle>
          <SheetDescription>
            {lead.companyName ? <Truncated value={lead.companyName} width="max-w-full" /> : "No company on file"}
          </SheetDescription>
        </SheetHeader>

        <div className="space-y-4 px-4 pb-4">
          <div className="flex flex-wrap items-center gap-2">
            {stage && (
              <Badge variant="outline" style={{ borderColor: stage.color, color: stage.color }}>
                {stage.name}
              </Badge>
            )}
            {/* A won or lost stage closes the lead. It is a label, not a lock:
                the lead can still be edited and moved back out. */}
            {outcome && (
              <Badge variant={outcome === "won" ? "default" : "destructive"}>{OUTCOME_LABEL[outcome]}</Badge>
            )}
            {/* Active / Closed / Dead. It follows the stage, so it is shown
                beside it rather than offered as something to set. */}
            {lead.lifecycle && (
              <Badge variant={lead.lifecycle === "active" ? "outline" : lead.lifecycle === "closed" ? "default" : "destructive"}>
                {LIFECYCLE_LABEL[lead.lifecycle]}
              </Badge>
            )}
            <Badge variant="secondary" className="capitalize">{lead.priority}</Badge>
            <Badge variant="secondary" className="capitalize">{lead.temperature}</Badge>
            {lead.assignedTo && <Badge variant="outline">{resolveOwnerName(owners, lead.assignedTo)}</Badge>}
          </div>

          <div className="grid grid-cols-2 gap-2 text-sm">
            {lead.email && <p className="text-muted-foreground">Email: <span className="text-foreground">{lead.email}</span></p>}
            {lead.mobile && (
              <p className="text-muted-foreground">
                Mobile: <a href={`tel:${lead.mobile}`} className="text-foreground hover:underline">{lead.mobile}</a>
              </p>
            )}
            {lead.alternateMobile && (
              <p className="text-muted-foreground">
                Alternate: <a href={`tel:${lead.alternateMobile}`} className="text-foreground hover:underline">{lead.alternateMobile}</a>
              </p>
            )}
            {lead.sourceName && <p className="text-muted-foreground">Source: <span className="text-foreground">{lead.sourceName}</span></p>}
            {lead.channelName && <p className="text-muted-foreground">Channel: <span className="text-foreground">{lead.channelName}</span></p>}
            {typeof lead.value === "number" && (
              <p className="text-muted-foreground">Value: <span className="text-foreground">₹{lead.value.toLocaleString("en-IN")}</span></p>
            )}
            {typeof lead.probability === "number" && (
              <p className="text-muted-foreground">Probability: <span className="text-foreground">{lead.probability}%</span></p>
            )}
            {lead.expectedCloseDate && (
              <p className="text-muted-foreground">Expected close: <span className="text-foreground">{asDate(lead.expectedCloseDate)}</span></p>
            )}
            {/* Nothing reminds anyone of this yet: the Calendar view and
                follow-up reminders are a separate feature still to come. */}
            {lead.nextFollowupAt && (
              <p className="text-muted-foreground">Next follow-up: <span className="text-foreground">{asMoment(lead.nextFollowupAt)}</span></p>
            )}
            <p className="text-muted-foreground">
              Last call: <span className="text-foreground">{CALL_STATUS_LABEL[lead.lastCallStatus ?? "none"]}</span>
            </p>
            {lead.adCampaign && (
              <p className="text-muted-foreground">
                Campaign: <span className="text-foreground">{lead.adCampaign.name ?? lead.adCampaign.id}</span>
              </p>
            )}
            <p className="text-muted-foreground">Created: <span className="text-foreground">{asMoment(lead.createdAt)}</span></p>
            <p className="text-muted-foreground">Updated: <span className="text-foreground">{asMoment(lead.updatedAt)}</span></p>
          </div>

          {(lead.address || lead.city || lead.state || lead.country || lead.pincode) && (
            <p className="text-sm text-muted-foreground">
              Address:{" "}
              <span className="text-foreground">
                {[lead.address, lead.city, lead.state, lead.country, lead.pincode].filter(Boolean).join(", ")}
              </span>
            </p>
          )}

          {/* `customFields` is undefined on a lead read from a list page and an
              object on one read on its own, so an empty object really means
              "nothing filled in", not "not loaded". */}
          {lead.customFields && customFields.length > 0 && (
            <div className="grid grid-cols-2 gap-2 text-sm">
              {customFields
                .filter((definition) => definition.active || lead.customFields?.[definition.key] !== undefined)
                .map((definition) => (
                  <p key={definition.id} className="text-muted-foreground">
                    {definition.label}:{" "}
                    <span className="text-foreground">
                      {customValueText(definition, lead.customFields?.[definition.key])}
                    </span>
                  </p>
                ))}
            </div>
          )}

          {lead.description && <p className="text-sm text-muted-foreground">{lead.description}</p>}

          {lead.tags.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {lead.tags.map((tag) => (
                <Badge key={tag} variant="outline" className="text-xs">{tag}</Badge>
              ))}
            </div>
          )}

          <div className="flex flex-wrap gap-2">
            {onEdit && (
              <Button size="sm" variant="outline" onClick={() => onEdit(lead)}>
                <Pencil className="h-3.5 w-3.5" /> Edit Lead
              </Button>
            )}

            {onConvert &&
              (lead.convertedContactId ? (
                <Button size="sm" variant="ghost" disabled>
                  <UserCheck className="h-3.5 w-3.5" /> Already a contact
                </Button>
              ) : (
                <Button size="sm" variant="secondary" onClick={() => onConvert(lead)}>
                  <UserCheck className="h-3.5 w-3.5" /> Convert to Contact
                </Button>
              ))}

            {/* LD-A7. Separate from "Convert to Contact" above: a contact is a
                person in the CRM, a client is who an invoice is addressed to,
                and a lead can become both. */}
            {onConvertToClient && (
              <Button
                size="sm"
                variant="secondary"
                disabled={convertingToClient}
                onClick={() => onConvertToClient(lead)}
              >
                {convertingToClient ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Building className="h-3.5 w-3.5" />
                )}
                {convertingToClient ? "Creating client..." : "Convert to client"}
              </Button>
            )}
          </div>

          <Tabs defaultValue="activity">
            <TabsList className="w-full">
              <TabsTrigger value="activity" className="flex-1">Activity</TabsTrigger>
              <TabsTrigger value="notes" className="flex-1">Notes</TabsTrigger>
              {attachments && <TabsTrigger value="attachments" className="flex-1">Attachments</TabsTrigger>}
            </TabsList>

            <TabsContent value="activity" className="space-y-3">
              {onAddActivity && (
                <div className="space-y-2 rounded-md border border-border p-3">
                  <div className="flex gap-2">
                    <Select value={activityType} onValueChange={(v) => setActivityType(v as LeadActivityType)}>
                      <SelectTrigger className="w-32">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {ACTIVITY_TYPES.map((type) => (
                          <SelectItem key={type} value={type} className="capitalize">{type}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Input
                      value={activitySubject}
                      onChange={(e) => setActivitySubject(e.target.value)}
                      placeholder="Subject"
                      className="flex-1"
                    />
                  </div>
                  {/* Logging a call is also how the lead's last call status is
                      set, which is what colours its call indicator. */}
                  {activityType === "call" && (
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-muted-foreground">How did it go?</span>
                      <Select value={callStatus} onValueChange={(v) => setCallStatus(v as LeadCallStatus)}>
                        <SelectTrigger className="w-44">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {CALL_OUTCOMES.map((outcome) => (
                            <SelectItem key={outcome} value={outcome}>
                              {CALL_STATUS_LABEL[outcome]}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )}
                  <Textarea
                    value={activityDescription}
                    onChange={(e) => setActivityDescription(e.target.value)}
                    placeholder="Details (optional)"
                    rows={2}
                  />
                  <Button size="sm" onClick={handleLogActivity} disabled={!activitySubject.trim()}>
                    Log Activity
                  </Button>
                </div>
              )}

              <ul className="space-y-3">
                {sortedActivities.map((activity) => (
                  <li key={activity.id} className="border-l-2 border-border pl-3">
                    <div className="flex items-center gap-2">
                      <Badge variant="secondary" className="capitalize">{activity.activityType}</Badge>
                      <span className="text-xs text-muted-foreground">
                        {formatDistanceToNow(new Date(activity.createdAt), { addSuffix: true })}
                      </span>
                    </div>
                    <p className="text-sm font-medium">{activity.subject}</p>
                    {activity.description && (
                      <p className="text-sm text-muted-foreground">{activity.description}</p>
                    )}
                  </li>
                ))}
                {sortedActivities.length === 0 && (
                  <p className="text-sm text-muted-foreground">No activity logged yet.</p>
                )}
              </ul>
            </TabsContent>

            <TabsContent value="notes" className="space-y-3">
              {onAddNote && (
                <div className="space-y-2 rounded-md border border-border p-3">
                  <Textarea
                    value={draftNote}
                    onChange={(e) => setDraftNote(e.target.value)}
                    placeholder="Write a note..."
                    rows={2}
                  />
                  <Button size="sm" onClick={handleAddNote} disabled={!draftNote.trim()}>
                    Add Note
                  </Button>
                </div>
              )}

              <ul className="space-y-3">
                {sortedNotes.map((note) => (
                  <li key={note.id} className="rounded-md border border-border p-2">
                    {editingNoteId === note.id ? (
                      <div className="space-y-2">
                        <Textarea
                          value={editingNoteText}
                          onChange={(e) => setEditingNoteText(e.target.value)}
                          rows={2}
                        />
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            onClick={() => {
                              onUpdateNote?.(note.id, editingNoteText.trim());
                              setEditingNoteId(null);
                            }}
                            disabled={!editingNoteText.trim()}
                          >
                            Save
                          </Button>
                          <Button size="sm" variant="outline" onClick={() => setEditingNoteId(null)}>
                            Cancel
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <>
                        <p className="text-sm">{note.note}</p>
                        <div className="mt-1 flex items-center justify-between">
                          <span className="text-xs text-muted-foreground">
                            {formatDistanceToNow(new Date(note.updatedAt), { addSuffix: true })}
                          </span>
                          <div className="flex gap-1">
                            {onUpdateNote && (
                              <Button
                                size="icon"
                                variant="ghost"
                                className="h-6 w-6"
                                aria-label="Edit note"
                                onClick={() => {
                                  setEditingNoteId(note.id);
                                  setEditingNoteText(note.note);
                                }}
                              >
                                <Pencil className="h-3 w-3" />
                              </Button>
                            )}
                            {onDeleteNote && (
                              <Button
                                size="icon"
                                variant="ghost"
                                className="h-6 w-6"
                                aria-label="Delete note"
                                onClick={() => onDeleteNote(note.id)}
                              >
                                <Trash2 className="h-3 w-3" />
                              </Button>
                            )}
                          </div>
                        </div>
                      </>
                    )}
                  </li>
                ))}
                {sortedNotes.length === 0 && (
                  <p className="text-sm text-muted-foreground">No notes yet.</p>
                )}
              </ul>
            </TabsContent>

            {attachments && (
              <TabsContent value="attachments">
                <LeadAttachments
                  key={lead.id}
                  leadId={lead.id}
                  owners={owners}
                  canUpload={attachments.canUpload}
                  canDelete={attachments.canDelete}
                />
              </TabsContent>
            )}
          </Tabs>
        </div>
      </SheetContent>
    </Sheet>
  );
}
