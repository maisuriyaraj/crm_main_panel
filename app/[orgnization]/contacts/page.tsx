"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Plus, Search, Trash2, Users } from "lucide-react";
import { notify } from "@/lib/commonFunctions";

import { useAppDispatch, useAppSelector } from "@/lib/store/hooks";
import { useAuth } from "@/hooks/useAuth";
import {
  reqToBulkDeleteContacts,
  reqToBulkUpdateContacts,
  reqToCreateContact,
  reqToDeleteContact,
  reqToCreateContactNote,
  reqToDeleteContactNote,
  reqToGetContactNotes,
  reqToGetContacts,
  reqToUpdateContact,
  reqToUpdateContactNote,
} from "@/lib/store/slices/contactsSlice";
import { reqToGetOrgUsers } from "@/lib/store/slices/orgUsersSlice";
import { mapApiErrorsToForm, mapContactPayloadToApi } from "@/lib/contacts/mappers";
import type { Contact, ContactListQuery } from "@/lib/contacts/types";
import { resolveOwnerName } from "@/lib/contacts/types";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  ContactFormDialog,
  type ContactFormServerError,
  type ContactFormValues,
} from "@/components/contacts/contact-form-dialog";
import { ContactDetailSheet } from "@/components/contacts/contact-detail-sheet";

const PAGE_SIZE = 20;
const ALL = "all";

// Long enough that typing a name does not fire a request per keystroke, short
// enough that the list still feels live.
const SEARCH_DEBOUNCE_MS = 350;

export default function ContactsPage() {
  const dispatch = useAppDispatch();
  const { user, role } = useAuth();
  const isAdmin = role === "org_admin";
  const currentUserId = user?.id ? String(user.id) : undefined;

  const { contacts, pagination, isLoading, activeContactNotes, notesLoading } = useAppSelector(
    (state) => state.contacts,
  );
  const owners = useAppSelector((state) => state.orgUsers.users);

  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [ownerFilter, setOwnerFilter] = useState(ALL);
  const [page, setPage] = useState(1);

  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [detailContact, setDetailContact] = useState<Contact | null>(null);
  const [editContact, setEditContact] = useState<Contact | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [formMode, setFormMode] = useState<"create" | "edit">("create");
  const [serverErrors, setServerErrors] = useState<ContactFormServerError[]>([]);

  const hasActiveFilters = search.trim() !== "" || ownerFilter !== ALL;

  // Every filter is sent to the API. The Leads screen pulls 1000 rows and filters
  // in the browser, which silently truncates past that; this does not.
  const query = useMemo<ContactListQuery>(() => {
    const next: ContactListQuery = { page, limit: PAGE_SIZE };
    if (search.trim()) next.search = search.trim();
    if (ownerFilter !== ALL) next.assigned_to = ownerFilter;
    return next;
  }, [page, search, ownerFilter]);

  const refreshContacts = useCallback(() => {
    dispatch(reqToGetContacts({ data: query }));
  }, [dispatch, query]);

  useEffect(() => {
    refreshContacts();
  }, [refreshContacts]);

  useEffect(() => {
    dispatch(reqToGetOrgUsers({ data: null }));
  }, [dispatch]);

  useEffect(() => {
    const timer = setTimeout(() => {
      setSearch(searchInput);
      setPage(1);
    }, SEARCH_DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [searchInput]);

  useEffect(() => {
    if (!detailContact) return;
    dispatch(reqToGetContactNotes({ data: { id: detailContact.id } }));
  }, [detailContact, dispatch]);

  // Selection is page-scoped; clear it whenever the visible rows change.
  useEffect(() => {
    setSelectedIds(new Set());
  }, [contacts]);

  const openCreate = () => {
    setFormMode("create");
    setEditContact(null);
    setServerErrors([]);
    setFormOpen(true);
  };

  const openEdit = (contact: Contact) => {
    setFormMode("edit");
    setEditContact(contact);
    setServerErrors([]);
    setFormOpen(true);
  };

  // Resolves false when the server rejected the write, so the dialog stays open
  // with the field errors painted on.
  const handleSubmit = (values: ContactFormValues): Promise<boolean> =>
    new Promise((resolve) => {
      setServerErrors([]);
      const body = mapContactPayloadToApi(values);

      const onFailure = (error: any) => {
        const data = error?.response?.data;
        const fieldErrors = mapApiErrorsToForm(data?.errors);

        if (error?.response?.status === 409) {
          setServerErrors([{ field: "email", message: data?.message ?? "This email is already in use" }]);
        } else if (fieldErrors.length) {
          setServerErrors(fieldErrors);
        } else {
          notify(data?.message ?? "Something went wrong", { type: "error" });
        }
        resolve(false);
      };

      const onSuccess = () => {
        notify(formMode === "create" ? "Contact created" : "Contact updated", { type: "success" });
        refreshContacts();
        resolve(true);
      };

      if (formMode === "create") {
        dispatch(reqToCreateContact({ data: body, onSuccess, onFailure }));
      } else if (editContact) {
        dispatch(reqToUpdateContact({ data: { id: editContact.id, ...body }, onSuccess, onFailure }));
      } else {
        resolve(false);
      }
    });

  const handleDelete = (contact: Contact) => {
    dispatch(
      reqToDeleteContact({
        data: { id: contact.id },
        onSuccess: () => {
          notify("Contact deleted", { type: "success" });
          setDetailContact(null);
          refreshContacts();
        },
        onFailure: (error: any) =>
          notify(error?.response?.data?.message ?? "Failed to delete contact", { type: "error" }),
      }),
    );
  };

  const handleBulkDelete = () => {
    dispatch(
      reqToBulkDeleteContacts({
        data: { ids: [...selectedIds] },
        onSuccess: (response: any) => {
          notify(`${response?.data?.deleted ?? 0} contacts deleted`, { type: "success" });
          setSelectedIds(new Set());
          refreshContacts();
        },
        onFailure: (error: any) =>
          notify(error?.response?.data?.message ?? "Failed to delete contacts", { type: "error" }),
      }),
    );
  };

  const handleBulkAssign = (ownerId: string) => {
    dispatch(
      reqToBulkUpdateContacts({
        data: { ids: [...selectedIds], data: { assigned_to: ownerId === ALL ? null : ownerId } },
        onSuccess: (response: any) => {
          notify(`${response?.data?.updated ?? 0} contacts updated`, { type: "success" });
          setSelectedIds(new Set());
          refreshContacts();
        },
        onFailure: (error: any) =>
          notify(error?.response?.data?.message ?? "Failed to update contacts", { type: "error" }),
      }),
    );
  };

  const noteAction = (thunk: any, data: any, successMessage: string) => {
    dispatch(
      thunk({
        data,
        onSuccess: () => {
          notify(successMessage, { type: "success" });
          if (detailContact) {
            dispatch(reqToGetContactNotes({ data: { id: detailContact.id } }));
          }
        },
        onFailure: (error: any) =>
          notify(error?.response?.data?.message ?? "Failed to save note", { type: "error" }),
      }),
    );
  };

  const toggleRow = (id: string) => {
    setSelectedIds((previous) => {
      const next = new Set(previous);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleAll = () => {
    setSelectedIds((previous) =>
      previous.size === contacts.length ? new Set() : new Set(contacts.map((c) => c.id)),
    );
  };

  const clearFilters = () => {
    setSearchInput("");
    setSearch("");
    setOwnerFilter(ALL);
    setPage(1);
  };

  const totalPages = pagination?.totalPages ?? 1;

  return (
    <div className="flex flex-col gap-4 p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">Contacts</h1>
          <p className="text-sm text-muted-foreground">
            {pagination ? `${pagination.total} total` : " "}
          </p>
        </div>
        <Button onClick={openCreate}>
          <Plus className="mr-2 h-4 w-4" />
          New Contact
        </Button>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <div className="relative min-w-[220px] flex-1">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            className="pl-8"
            placeholder="Search name, email, mobile, company..."
            value={searchInput}
            onChange={(event) => setSearchInput(event.target.value)}
          />
        </div>

        <Select
          value={ownerFilter}
          onValueChange={(value) => {
            setOwnerFilter(value);
            setPage(1);
          }}
        >
          <SelectTrigger className="w-[190px]">
            <SelectValue placeholder="All owners" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>All owners</SelectItem>
            {owners.map((owner) => (
              <SelectItem key={owner.id} value={owner.id}>
                {owner.fullName}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {hasActiveFilters && (
          <Button variant="ghost" onClick={clearFilters}>
            Clear filters
          </Button>
        )}
      </div>

      {selectedIds.size > 0 && isAdmin && (
        <div className="flex flex-wrap items-center gap-2 rounded-md border bg-muted/40 p-2">
          <span className="text-sm">{selectedIds.size} selected</span>
          <Select onValueChange={handleBulkAssign}>
            <SelectTrigger className="w-[190px]">
              <SelectValue placeholder="Reassign to..." />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL}>Unassigned</SelectItem>
              {owners.map((owner) => (
                <SelectItem key={owner.id} value={owner.id}>
                  {owner.fullName}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button variant="destructive" size="sm" onClick={handleBulkDelete}>
            <Trash2 className="mr-2 h-3.5 w-3.5" />
            Delete
          </Button>
        </div>
      )}

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              {isAdmin && (
                <TableHead className="w-10">
                  <Checkbox
                    checked={contacts.length > 0 && selectedIds.size === contacts.length}
                    onCheckedChange={toggleAll}
                    aria-label="Select all"
                  />
                </TableHead>
              )}
              <TableHead>Name</TableHead>
              <TableHead>Company</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Mobile</TableHead>
              <TableHead>Owner</TableHead>
              <TableHead>Tags</TableHead>
              {isAdmin && <TableHead className="w-10" />}
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              Array.from({ length: 5 }).map((_, index) => (
                <TableRow key={index}>
                  <TableCell colSpan={isAdmin ? 8 : 6}>
                    <Skeleton className="h-6 w-full" />
                  </TableCell>
                </TableRow>
              ))
            ) : contacts.length === 0 ? (
              <TableRow>
                <TableCell colSpan={isAdmin ? 8 : 6} className="py-12 text-center">
                  <Users className="mx-auto mb-3 h-8 w-8 text-muted-foreground" />
                  {hasActiveFilters ? (
                    <>
                      <p className="text-sm">No contacts match these filters.</p>
                      <Button variant="link" onClick={clearFilters}>
                        Clear filters
                      </Button>
                    </>
                  ) : (
                    <>
                      <p className="text-sm">No contacts yet.</p>
                      <Button variant="link" onClick={openCreate}>
                        Add your first contact
                      </Button>
                    </>
                  )}
                </TableCell>
              </TableRow>
            ) : (
              contacts.map((contact) => (
                <TableRow
                  key={contact.id}
                  className="cursor-pointer"
                  onClick={() => setDetailContact(contact)}
                >
                  {isAdmin && (
                    <TableCell onClick={(event) => event.stopPropagation()}>
                      <Checkbox
                        checked={selectedIds.has(contact.id)}
                        onCheckedChange={() => toggleRow(contact.id)}
                        aria-label={`Select ${contact.fullName}`}
                      />
                    </TableCell>
                  )}
                  <TableCell className="font-medium">{contact.fullName}</TableCell>
                  <TableCell>{contact.companyName ?? "—"}</TableCell>
                  <TableCell>{contact.email ?? "—"}</TableCell>
                  <TableCell>{contact.mobile ?? "—"}</TableCell>
                  <TableCell>
                    {contact.assignedTo ? (
                      resolveOwnerName(owners, contact.assignedTo)
                    ) : (
                      <span className="text-muted-foreground">Unassigned</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-1">
                      {contact.tags.slice(0, 2).map((tag) => (
                        <Badge key={tag} variant="secondary">
                          {tag}
                        </Badge>
                      ))}
                      {contact.tags.length > 2 && (
                        <Badge variant="outline">+{contact.tags.length - 2}</Badge>
                      )}
                    </div>
                  </TableCell>
                  {isAdmin && (
                    <TableCell onClick={(event) => event.stopPropagation()}>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-8 w-8"
                        onClick={() => handleDelete(contact)}
                        aria-label={`Delete ${contact.fullName}`}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  )}
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            Page {pagination?.page ?? page} of {totalPages}
          </p>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={page <= 1}
              onClick={() => setPage((current) => Math.max(1, current - 1))}
            >
              Previous
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={page >= totalPages}
              onClick={() => setPage((current) => Math.min(totalPages, current + 1))}
            >
              Next
            </Button>
          </div>
        </div>
      )}

      <ContactFormDialog
        mode={formMode}
        initialContact={editContact ?? undefined}
        owners={owners}
        open={formOpen}
        onOpenChange={setFormOpen}
        onSubmit={handleSubmit}
        serverErrors={serverErrors}
      />

      <ContactDetailSheet
        contact={detailContact}
        owners={owners}
        notes={activeContactNotes}
        notesLoading={notesLoading}
        currentUserId={currentUserId}
        isAdmin={isAdmin}
        open={!!detailContact}
        onOpenChange={(open) => !open && setDetailContact(null)}
        onEdit={(contact) => {
          setDetailContact(null);
          openEdit(contact);
        }}
        onAddNote={(note) =>
          noteAction(reqToCreateContactNote, { id: detailContact?.id, note }, "Note added")
        }
        onUpdateNote={(noteId, note) =>
          noteAction(reqToUpdateContactNote, { noteId, note }, "Note updated")
        }
        onDeleteNote={(noteId) => noteAction(reqToDeleteContactNote, { noteId }, "Note deleted")}
      />
    </div>
  );
}
