"use client";

import { useState } from "react";
import { formatDistanceToNow } from "date-fns";
import { Pencil, Trash2 } from "lucide-react";

import {
  DEMO_LEAD_STATUSES,
  ownerName,
  type Lead,
  type LeadActivity,
  type LeadActivityType,
  type LeadNote,
} from "@/lib/leads/demo-data";
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

const ACTIVITY_TYPES: LeadActivityType[] = ["call", "email", "meeting", "note", "whatsapp", "sms", "demo"];

interface LeadDetailSheetProps {
  lead: Lead | null;
  activities: LeadActivity[];
  notes: LeadNote[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onEdit: (lead: Lead) => void;
  onAddActivity: (leadId: string, values: { activityType: LeadActivityType; subject: string; description?: string }) => void;
  onAddNote: (leadId: string, note: string) => void;
  onUpdateNote: (noteId: string, note: string) => void;
  onDeleteNote: (noteId: string) => void;
}

export function LeadDetailSheet({
  lead,
  activities,
  notes,
  open,
  onOpenChange,
  onEdit,
  onAddActivity,
  onAddNote,
  onUpdateNote,
  onDeleteNote,
}: LeadDetailSheetProps) {
  const [activityType, setActivityType] = useState<LeadActivityType>("call");
  const [activitySubject, setActivitySubject] = useState("");
  const [activityDescription, setActivityDescription] = useState("");

  const [draftNote, setDraftNote] = useState("");
  const [editingNoteId, setEditingNoteId] = useState<string | null>(null);
  const [editingNoteText, setEditingNoteText] = useState("");

  if (!lead) return null;

  const stage = DEMO_LEAD_STATUSES.find((s) => s.id === lead.statusId);

  const handleLogActivity = () => {
    if (!activitySubject.trim()) return;
    onAddActivity(lead.id, {
      activityType,
      subject: activitySubject.trim(),
      description: activityDescription.trim() || undefined,
    });
    setActivitySubject("");
    setActivityDescription("");
  };

  const handleAddNote = () => {
    if (!draftNote.trim()) return;
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
          <SheetTitle>{lead.fullName}</SheetTitle>
          <SheetDescription>{lead.companyName || "No company on file"}</SheetDescription>
        </SheetHeader>

        <div className="space-y-4 px-4 pb-4">
          <div className="flex flex-wrap items-center gap-2">
            {stage && (
              <Badge variant="outline" style={{ borderColor: stage.color, color: stage.color }}>
                {stage.name}
              </Badge>
            )}
            <Badge variant="secondary" className="capitalize">{lead.priority}</Badge>
            <Badge variant="secondary" className="capitalize">{lead.temperature}</Badge>
            {lead.assignedTo && <Badge variant="outline">{ownerName(lead.assignedTo)}</Badge>}
          </div>

          <div className="grid grid-cols-2 gap-2 text-sm">
            {lead.email && <p className="text-muted-foreground">Email: <span className="text-foreground">{lead.email}</span></p>}
            {lead.mobile && <p className="text-muted-foreground">Mobile: <span className="text-foreground">{lead.mobile}</span></p>}
            {typeof lead.value === "number" && (
              <p className="text-muted-foreground">Value: <span className="text-foreground">₹{lead.value.toLocaleString("en-IN")}</span></p>
            )}
            {typeof lead.probability === "number" && (
              <p className="text-muted-foreground">Probability: <span className="text-foreground">{lead.probability}%</span></p>
            )}
          </div>

          {lead.description && <p className="text-sm text-muted-foreground">{lead.description}</p>}

          {lead.tags.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {lead.tags.map((tag) => (
                <Badge key={tag} variant="outline" className="text-xs">{tag}</Badge>
              ))}
            </div>
          )}

          <Button size="sm" variant="outline" onClick={() => onEdit(lead)}>
            <Pencil className="h-3.5 w-3.5" /> Edit Lead
          </Button>

          <Tabs defaultValue="activity">
            <TabsList className="w-full">
              <TabsTrigger value="activity" className="flex-1">Activity</TabsTrigger>
              <TabsTrigger value="notes" className="flex-1">Notes</TabsTrigger>
            </TabsList>

            <TabsContent value="activity" className="space-y-3">
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
                              onUpdateNote(note.id, editingNoteText.trim());
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
                            <Button
                              size="icon"
                              variant="ghost"
                              className="h-6 w-6"
                              onClick={() => {
                                setEditingNoteId(note.id);
                                setEditingNoteText(note.note);
                              }}
                            >
                              <Pencil className="h-3 w-3" />
                            </Button>
                            <Button
                              size="icon"
                              variant="ghost"
                              className="h-6 w-6"
                              onClick={() => onDeleteNote(note.id)}
                            >
                              <Trash2 className="h-3 w-3" />
                            </Button>
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
          </Tabs>
        </div>
      </SheetContent>
    </Sheet>
  );
}
