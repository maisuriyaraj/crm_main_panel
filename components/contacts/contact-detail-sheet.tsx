"use client";

import { useState } from "react";
import { Pencil, Trash2 } from "lucide-react";

import type { Contact, ContactNote, ContactOwner } from "@/lib/contacts/types";
import { resolveOwnerName } from "@/lib/contacts/types";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";

interface ContactDetailSheetProps {
  contact: Contact | null;
  owners: ContactOwner[];
  notes: ContactNote[];
  notesLoading: boolean;
  currentUserId?: string;
  isAdmin: boolean;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onEdit: (contact: Contact) => void;
  onAddNote: (note: string) => void;
  onUpdateNote: (noteId: string, note: string) => void;
  onDeleteNote: (noteId: string) => void;
}

const Field = ({ label, value }: { label: string; value?: string }) => (
  <div>
    <p className="text-xs text-muted-foreground">{label}</p>
    <p className="text-sm">{value && value.trim() !== "" ? value : "—"}</p>
  </div>
);

export function ContactDetailSheet({
  contact,
  owners,
  notes,
  notesLoading,
  currentUserId,
  isAdmin,
  open,
  onOpenChange,
  onEdit,
  onAddNote,
  onUpdateNote,
  onDeleteNote,
}: ContactDetailSheetProps) {
  const [draft, setDraft] = useState("");
  const [editingNoteId, setEditingNoteId] = useState<string | null>(null);
  const [editDraft, setEditDraft] = useState("");

  if (!contact) return null;

  // Mirrors the server rule: a note may be changed by its author or an org admin.
  const canMutateNote = (note: ContactNote) =>
    isAdmin || (!!currentUserId && note.createdBy === currentUserId);

  const submitNote = () => {
    const value = draft.trim();
    if (!value) return;
    onAddNote(value);
    setDraft("");
  };

  const submitEdit = (noteId: string) => {
    const value = editDraft.trim();
    if (!value) return;
    onUpdateNote(noteId, value);
    setEditingNoteId(null);
    setEditDraft("");
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="flex w-full flex-col gap-0 overflow-y-auto p-0 sm:max-w-lg">
        <SheetHeader className="p-6 pb-4">
          <SheetTitle>{contact.fullName}</SheetTitle>
          <SheetDescription>
            {contact.designation && contact.companyName
              ? `${contact.designation} at ${contact.companyName}`
              : contact.companyName ?? contact.designation ?? "Contact"}
          </SheetDescription>
          <div className="flex gap-2 pt-2">
            <Button size="sm" variant="outline" onClick={() => onEdit(contact)}>
              <Pencil className="mr-2 h-3.5 w-3.5" />
              Edit
            </Button>
          </div>
        </SheetHeader>

        <Separator />

        <div className="grid grid-cols-2 gap-4 p-6">
          <Field label="Email" value={contact.email} />
          <Field label="Mobile" value={contact.mobile} />
          <Field label="Alternate Mobile" value={contact.alternateMobile} />
          <Field label="Website" value={contact.website} />
          <Field label="Company" value={contact.companyName} />
          <Field label="Designation" value={contact.designation} />
          <Field label="Owner" value={resolveOwnerName(owners, contact.assignedTo)} />
          <Field
            label="Origin"
            value={contact.sourceLeadId ? `Converted from lead #${contact.sourceLeadId}` : "Created directly"}
          />
        </div>

        {contact.tags.length > 0 && (
          <div className="px-6 pb-4">
            <p className="pb-2 text-xs text-muted-foreground">Tags</p>
            <div className="flex flex-wrap gap-1.5">
              {contact.tags.map((tag) => (
                <Badge key={tag} variant="secondary">
                  {tag}
                </Badge>
              ))}
            </div>
          </div>
        )}

        {contact.description && (
          <div className="px-6 pb-4">
            <p className="pb-1 text-xs text-muted-foreground">Description</p>
            <p className="text-sm whitespace-pre-wrap">{contact.description}</p>
          </div>
        )}

        <Separator />

        <div className="flex flex-col gap-3 p-6">
          <p className="text-sm font-medium">Notes</p>

          <div className="flex flex-col gap-2">
            <Textarea
              rows={3}
              placeholder="Add a note..."
              value={draft}
              onChange={(event) => setDraft(event.target.value)}
            />
            <Button size="sm" className="self-end" onClick={submitNote} disabled={!draft.trim()}>
              Add Note
            </Button>
          </div>

          {notesLoading ? (
            <div className="flex flex-col gap-2">
              <Skeleton className="h-16 w-full" />
              <Skeleton className="h-16 w-full" />
            </div>
          ) : notes.length === 0 ? (
            <p className="py-4 text-center text-sm text-muted-foreground">No notes yet.</p>
          ) : (
            <div className="flex flex-col gap-3">
              {notes.map((note) => (
                <div key={note.id} className="rounded-md border p-3">
                  {editingNoteId === note.id ? (
                    <div className="flex flex-col gap-2">
                      <Textarea
                        rows={3}
                        value={editDraft}
                        onChange={(event) => setEditDraft(event.target.value)}
                      />
                      <div className="flex gap-2 self-end">
                        <Button size="sm" variant="ghost" onClick={() => setEditingNoteId(null)}>
                          Cancel
                        </Button>
                        <Button size="sm" onClick={() => submitEdit(note.id)}>
                          Save
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <>
                      <p className="text-sm whitespace-pre-wrap">{note.note}</p>
                      <div className="flex items-center justify-between pt-2">
                        <p className="text-xs text-muted-foreground">
                          {resolveOwnerName(owners, note.createdBy)} ·{" "}
                          {new Date(note.createdAt).toLocaleString()}
                        </p>
                        {canMutateNote(note) && (
                          <div className="flex gap-1">
                            <Button
                              size="icon"
                              variant="ghost"
                              className="h-7 w-7"
                              onClick={() => {
                                setEditingNoteId(note.id);
                                setEditDraft(note.note);
                              }}
                            >
                              <Pencil className="h-3.5 w-3.5" />
                            </Button>
                            <Button
                              size="icon"
                              variant="ghost"
                              className="h-7 w-7"
                              onClick={() => onDeleteNote(note.id)}
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        )}
                      </div>
                    </>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
