"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Plus, Search, Trash2 } from "lucide-react";
import { notify } from "@/lib/commonFunctions";

import { useAppDispatch, useAppSelector } from "@/lib/store/hooks";
import { useAuth } from "@/hooks/useAuth";
import { useCreateFromUrl } from "@/hooks/useCreateFromUrl";
import { useServerList } from "@/hooks/useServerList";
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
import { reqToGetMemberOptions } from "@/lib/store/slices/orgUsersSlice";
import { mapApiErrorsToForm, mapContactPayloadToApi } from "@/lib/contacts/mappers";
import type { Contact } from "@/lib/contacts/types";
import { resolveOwnerName } from "@/lib/contacts/types";
import { isCountChanged, selectionCount } from "@/lib/lists/types";
import { helpFor } from "@/lib/lists/help-text";
import { exportSelectionParams } from "@/lib/exports";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  ContactFormDialog,
  type ContactFormServerError,
  type ContactFormValues,
} from "@/components/contacts/contact-form-dialog";
import { ContactDetailSheet } from "@/components/contacts/contact-detail-sheet";
import { NoAccess } from "@/components/auth/no-access";
import { ExportButton } from "@/components/shared/export-button";
import { ServerList, type ServerListColumn } from "@/components/shared/server-list";
import { SavedViewsBar } from "@/components/shared/saved-views-bar";
import { Truncated } from "@/components/shared/field-help";
import { apiRoutes } from "@/lib/constants";

const LIST_KEY = "contacts";
const ALL = "all";

// Long enough that typing a name does not fire a request per keystroke, short
// enough that the list still feels live.
const SEARCH_DEBOUNCE_MS = 350;

const dateCell = (value?: string) => (value ? new Date(value).toLocaleDateString("en-IN") : "—");

export default function ContactsPage() {
  const { user, can } = useAuth();
  if (!user) return null;
  if (!can("contacts.view")) return <NoAccess title="Contacts" area="Contacts" module="contacts" />;
  return <ContactsWorkspace />;
}

// Each control is gated by the key its API route checks (contacts.routes.js).
function ContactsWorkspace() {
  const dispatch = useAppDispatch();
  const { user, can } = useAuth();
  const canCreate = can("contacts.create");
  const canUpdate = can("contacts.update");
  const canBulk = can("contacts.bulk");
  const canDelete = can("contacts.delete");
  const canExport = can("contacts.export");
  const canManageNotes = can("contacts.notes.manage");
  const canLookupMembers = can("members.lookup");
  const currentUserId = user?.id ? String(user.id) : undefined;

  const { contacts, pagination, isLoading, hasAnyWithoutFilters, emptyState, activeContactNotes, notesLoading } = useAppSelector(
    (state) => state.contacts,
  );
  // Active teammates (names only), readable by every role.
  const owners = useAppSelector((state) => state.orgUsers.memberOptions);
  // Pickers offer only people the member may assign contacts to (own scope:
  // themself; team scope: their team); names still resolve from the full list.
  const assignableOwners = owners.filter((owner) => owner.assignable?.contacts !== false);

  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [ownerFilter, setOwnerFilter] = useState(ALL);

  const [detailContact, setDetailContact] = useState<Contact | null>(null);
  const [editContact, setEditContact] = useState<Contact | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [formMode, setFormMode] = useState<"create" | "edit">("create");
  const [serverErrors, setServerErrors] = useState<ContactFormServerError[]>([]);

  // Every filter is sent to the API, the same as Leads: both lists now run on
  // the shared list contract and answer the same pager shape.
  const filters = useMemo(
    () => ({
      search: search.trim() || undefined,
      assigned_to: ownerFilter !== ALL ? ownerFilter : undefined,
    }),
    [search, ownerFilter],
  );

  const hasFilters = search.trim() !== "" || ownerFilter !== ALL;

  const applyFilters = useCallback((next: Record<string, string>) => {
    setSearchInput(next.search ?? "");
    setSearch(next.search ?? "");
    setOwnerFilter(next.assigned_to ?? ALL);
  }, []);

  const list = useServerList({
    listKey: LIST_KEY,
    filters,
    hasFilters,
    onApplyFilters: applyFilters,
  });

  const refreshContacts = useCallback(() => {
    dispatch(reqToGetContacts({ data: list.query }));
  }, [dispatch, list.query]);

  useEffect(() => {
    refreshContacts();
  }, [refreshContacts]);

  useEffect(() => {
    if (canLookupMembers) dispatch(reqToGetMemberOptions({ data: null }));
  }, [dispatch, canLookupMembers]);

  useEffect(() => {
    const timer = setTimeout(() => {
      setSearch(searchInput);
      list.resetPaging();
    }, SEARCH_DEBOUNCE_MS);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchInput]);

  useEffect(() => {
    if (!detailContact) return;
    dispatch(reqToGetContactNotes({ data: { id: detailContact.id } }));
  }, [detailContact, dispatch]);

  const total = pagination?.total ?? contacts.length;
  const chosen = selectionCount(list.selection);
  const allMatching = list.selection.mode === "all_matching";

  const clearFilters = () => {
    applyFilters({});
    list.resetPaging();
  };

  const openCreate = () => {
    setFormMode("create");
    setEditContact(null);
    setServerErrors([]);
    setFormOpen(true);
  };

  // Opens this form when the top bar's Create menu links here with ?new=1.
  useCreateFromUrl(openCreate);

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
          list.clearSelection();
          refreshContacts();
        },
        onFailure: (error: any) =>
          notify(error?.response?.data?.message ?? "Failed to delete contact", { type: "error" }),
      }),
    );
  };

  // The server re-counts "everything matching" under a lock before it acts. If
  // the number moved, nothing was changed: reload so the member sees the real
  // count, and let them decide whether to run it again.
  const bulkFailed = (fallback: string) => (error: any) => {
    if (isCountChanged(error)) {
      refreshContacts();
      list.clearSelection();
      notify(
        `${error?.response?.data?.message ?? "The list changed while you were working."} Nothing was changed — check the new count and try again.`,
        { type: "error" },
      );
      return;
    }
    notify(error?.response?.data?.message ?? fallback, { type: "error" });
  };

  const runBulk = (
    thunk: typeof reqToBulkUpdateContacts | typeof reqToBulkDeleteContacts,
    extra: Record<string, unknown> | undefined,
    done: (response: any) => string,
    fallback: string,
  ) => {
    const payload = list.bulkPayload(extra);
    if (!payload) return;
    dispatch(
      thunk({
        data: payload,
        onSuccess: (response: any) => {
          notify(done(response), { type: "success" });
          list.clearSelection();
          refreshContacts();
        },
        onFailure: bulkFailed(fallback),
      }),
    );
  };

  const handleBulkDelete = () =>
    runBulk(
      reqToBulkDeleteContacts,
      undefined,
      (response) => `${response?.data?.deleted ?? 0} contacts deleted`,
      "Failed to delete contacts",
    );

  const handleBulkAssign = (ownerId: string) =>
    runBulk(
      reqToBulkUpdateContacts,
      { data: { assigned_to: ownerId === ALL ? null : ownerId } },
      (response) => `${response?.data?.updated ?? 0} contacts updated`,
      "Failed to update contacts",
    );

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

  // The API serves this copy with the column choices; the local map is the
  // fallback for the first render, before the preferences come back.
  const help = (key: string) => list.fieldHelp[key] ?? helpFor(LIST_KEY, key);

  // Keys match the API's own column catalog, so a stored column choice and a
  // saved view mean the same thing on both sides.
  const columns: ServerListColumn<Contact>[] = [
    {
      key: "full_name",
      header: "Name",
      sortBy: "full_name",
      render: (row) => <Truncated value={row.fullName} className="font-medium" />,
    },
    {
      key: "company_name",
      header: "Company",
      sortBy: "company_name",
      render: (row) => <Truncated value={row.companyName} />,
    },
    { key: "email", header: "Email", render: (row) => <Truncated value={row.email} /> },
    { key: "mobile", header: "Mobile", render: (row) => row.mobile ?? "—" },
    {
      key: "assignee",
      header: "Owner",
      help: help("assignee"),
      render: (row) =>
        row.assignedTo ? (
          <Truncated value={resolveOwnerName(owners, row.assignedTo)} width="max-w-40" />
        ) : (
          <span className="text-muted-foreground">Unassigned</span>
        ),
    },
    {
      key: "tags",
      header: "Tags",
      help: help("tags"),
      render: (row) => (
        <div className="flex flex-wrap gap-1">
          {row.tags.slice(0, 2).map((tag) => (
            <Badge key={tag} variant="secondary">
              {tag}
            </Badge>
          ))}
          {row.tags.length > 2 && <Badge variant="outline">+{row.tags.length - 2}</Badge>}
        </div>
      ),
    },
    { key: "first_name", header: "First name", render: (row) => <Truncated value={row.firstName} /> },
    { key: "last_name", header: "Last name", render: (row) => <Truncated value={row.lastName} /> },
    {
      key: "alternate_mobile",
      header: "Alternate mobile",
      help: help("alternate_mobile"),
      render: (row) => row.alternateMobile ?? "—",
    },
    {
      key: "designation",
      header: "Designation",
      help: help("designation"),
      render: (row) => <Truncated value={row.designation} />,
    },
    { key: "website", header: "Website", render: (row) => <Truncated value={row.website} /> },
    {
      key: "source_lead_id",
      header: "From lead",
      help: help("source_lead_id"),
      render: (row) => (row.sourceLeadId ? `Lead #${row.sourceLeadId}` : "—"),
    },
    { key: "description", header: "Notes", render: (row) => <Truncated value={row.description} /> },
    { key: "created_at", header: "Created", sortBy: "created_at", render: (row) => dateCell(row.createdAt) },
    { key: "updated_at", header: "Updated", sortBy: "updated_at", render: (row) => dateCell(row.updatedAt) },
  ];

  const leading: ServerListColumn<Contact>[] = canBulk
    ? [{ key: "select", header: "", render: () => null }]
    : [];

  const trailing: ServerListColumn<Contact>[] = canDelete
    ? [
        {
          key: "actions",
          header: "",
          className: "w-10 text-right",
          render: (row) => (
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button size="icon" variant="ghost" className="h-8 w-8" aria-label={`Delete ${row.fullName}`}>
                  <Trash2 className="h-4 w-4" />
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Delete {row.fullName}?</AlertDialogTitle>
                  <AlertDialogDescription>
                    The contact is removed from your list. Invoices already raised for them are kept.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction onClick={() => handleDelete(row)}>Delete</AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          ),
        },
      ]
    : [];

  const exportParams = { ...list.filters, ...exportSelectionParams(list.selection) };
  const exportScope =
    list.selection.mode === "ids"
      ? `The ${list.selection.ids.length} selected contact(s)`
      : `All ${total.toLocaleString("en-IN")} contact(s) matching your filters`;

  return (
    <div className="flex flex-col gap-4 p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">Contacts</h1>
          <p className="text-sm text-muted-foreground">
            {pagination ? `${pagination.total.toLocaleString("en-IN")} total` : " "}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {canExport && (
            <ExportButton
              path={apiRoutes.contactsExport}
              params={exportParams}
              fileName="contacts"
              scopeLabel={exportScope}
            />
          )}
          {canCreate && (
            <Button onClick={openCreate}>
              <Plus className="mr-2 h-4 w-4" />
              New Contact
            </Button>
          )}
        </div>
      </div>

      <SavedViewsBar
        listKey={LIST_KEY}
        activeViewId={list.activeViewId}
        onApply={list.applyView}
        current={{ filters, sort: list.sort, columns: list.columns, viewMode: "table" }}
      />

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
            list.resetPaging();
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

        {hasFilters && (
          <Button variant="ghost" onClick={clearFilters}>
            Clear filters
          </Button>
        )}
      </div>

      {chosen > 0 && canBulk && (
        <div className="flex flex-wrap items-center gap-2 rounded-md border bg-muted/40 p-2">
          <span className="text-sm">
            {allMatching ? `All ${chosen.toLocaleString("en-IN")} matching contacts` : `${chosen} selected`}
          </span>
          <Select onValueChange={handleBulkAssign}>
            <SelectTrigger className="w-[190px]">
              <SelectValue placeholder="Reassign to..." />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL}>Unassigned</SelectItem>
              {assignableOwners.map((owner) => (
                <SelectItem key={owner.id} value={owner.id}>
                  {owner.fullName}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="destructive" size="sm">
                <Trash2 className="mr-2 h-3.5 w-3.5" />
                Delete
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>
                  Delete {allMatching ? `all ${chosen.toLocaleString("en-IN")} matching` : chosen} contact(s)?
                </AlertDialogTitle>
                <AlertDialogDescription>
                  {allMatching
                    ? "This deletes every contact matching your current filters, including those on other pages."
                    : "The contacts are removed from your list."}
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={handleBulkDelete}>Delete</AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      )}

      <ServerList<Contact>
        rows={contacts}
        getRowId={(row) => row.id}
        leading={leading}
        columns={columns}
        trailing={trailing}
        isLoading={isLoading}
        pagination={pagination}
        page={list.page}
        perPage={list.perPage}
        onPageChange={list.setPage}
        onPerPageChange={list.setPerPage}
        sort={list.sort}
        onSortChange={list.setSort}
        columnChoices={list.columns}
        columnHelp={list.fieldHelp}
        onColumnsChange={list.saveColumns}
        onColumnsReset={list.resetColumns}
        selection={canBulk ? list.selection : undefined}
        onSelectionChange={canBulk ? list.setSelection : undefined}
        emptyState={emptyState}
        noun={list.nouns?.one ?? "contact"}
        nounPlural={list.nouns?.many ?? "contacts"}
        hasFilters={hasFilters}
        hasAnyWithoutFilters={hasAnyWithoutFilters}
        onClearFilters={clearFilters}
        createAction={canCreate ? { label: "New Contact", onClick: openCreate } : undefined}
        onRowClick={(row) => setDetailContact(row)}
      />

      <ContactFormDialog
        mode={formMode}
        initialContact={editContact ?? undefined}
        owners={
          editContact?.assignedTo && !assignableOwners.some((owner) => owner.id === editContact.assignedTo)
            ? [...assignableOwners, ...owners.filter((owner) => owner.id === editContact.assignedTo)]
            : assignableOwners
        }
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
        canManageNotes={canManageNotes}
        open={!!detailContact}
        onOpenChange={(open) => !open && setDetailContact(null)}
        onEdit={
          canUpdate
            ? (contact) => {
                setDetailContact(null);
                openEdit(contact);
              }
            : undefined
        }
        onAddNote={
          canUpdate
            ? (note) => noteAction(reqToCreateContactNote, { id: detailContact?.id, note }, "Note added")
            : undefined
        }
        onUpdateNote={
          canUpdate ? (noteId, note) => noteAction(reqToUpdateContactNote, { noteId, note }, "Note updated") : undefined
        }
        onDeleteNote={
          canUpdate ? (noteId) => noteAction(reqToDeleteContactNote, { noteId }, "Note deleted") : undefined
        }
      />
    </div>
  );
}
