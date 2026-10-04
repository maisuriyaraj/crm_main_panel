// Converts the backend Contacts API's snake_case response shape (see
// backend/docs/modules/contacts/specs/001-contacts-module.md) into this app's
// camelCase Contact/ContactNote types, and the reverse for outgoing write bodies.
// Every id is coerced to a string here since the backend uses numeric (BIGINT)
// primary keys but the components treat ids as strings (Set<string> selection,
// string equality checks, etc).

import type { ApiFieldError, Contact, ContactNote } from "@/lib/contacts/types";

const toStringId = (value: unknown): string | undefined =>
  value === null || value === undefined ? undefined : String(value);

const emptyToUndefined = (value?: string): string | undefined =>
  value && value.trim() !== "" ? value : undefined;

export const mapContactFromApi = (raw: any): Contact => ({
  id: String(raw.id),
  firstName: raw.first_name ?? undefined,
  lastName: raw.last_name ?? undefined,
  fullName: raw.full_name,
  email: raw.email ?? undefined,
  mobile: raw.mobile ?? undefined,
  alternateMobile: raw.alternate_mobile ?? undefined,
  companyName: raw.company_name ?? undefined,
  designation: raw.designation ?? undefined,
  website: raw.website ?? undefined,
  description: raw.description ?? undefined,
  assignedTo: toStringId(raw.assigned_to),
  sourceLeadId: toStringId(raw.source_lead_id),
  tags: Array.isArray(raw.tags) ? raw.tags.map((tag: any) => tag.name) : [],
  createdAt: raw.created_at,
  updatedAt: raw.updated_at,
});

export const mapContactNoteFromApi = (raw: any): ContactNote => ({
  id: String(raw.id),
  contactId: String(raw.contact_id),
  note: raw.note,
  createdBy: toStringId(raw.created_by) ?? "",
  createdAt: raw.created_at,
  updatedAt: raw.updated_at,
});

// Input shape matches `ContactFormValues` (components/contacts/contact-form-dialog.tsx)
// field-for-field, kept structural here to avoid a circular import.
interface ContactFormPayload {
  fullName: string;
  firstName?: string;
  lastName?: string;
  email?: string;
  mobile?: string;
  alternateMobile?: string;
  companyName?: string;
  designation?: string;
  website?: string;
  description?: string;
  assignedTo?: string;
  tags: string[];
}

// Empty strings become undefined so they are dropped from the body rather than
// sent as "", which the server's email validator would reject.
export const mapContactPayloadToApi = (values: ContactFormPayload) => ({
  full_name: values.fullName,
  first_name: emptyToUndefined(values.firstName),
  last_name: emptyToUndefined(values.lastName),
  email: emptyToUndefined(values.email),
  mobile: emptyToUndefined(values.mobile),
  alternate_mobile: emptyToUndefined(values.alternateMobile),
  company_name: emptyToUndefined(values.companyName),
  designation: emptyToUndefined(values.designation),
  website: emptyToUndefined(values.website),
  description: emptyToUndefined(values.description),
  assigned_to: emptyToUndefined(values.assignedTo),
  tags: values.tags,
});

// Maps the API field name in a 400 `errors` entry back to the form field name,
// so react-hook-form can attach the message to the right input.
const API_TO_FORM_FIELD: Record<string, string> = {
  full_name: "fullName",
  first_name: "firstName",
  last_name: "lastName",
  email: "email",
  mobile: "mobile",
  alternate_mobile: "alternateMobile",
  company_name: "companyName",
  designation: "designation",
  website: "website",
  description: "description",
  assigned_to: "assignedTo",
  tags: "tags",
};

export const mapApiErrorsToForm = (errors?: ApiFieldError[]) => {
  if (!Array.isArray(errors)) return [];
  return errors
    .filter((error) => error.field && API_TO_FORM_FIELD[error.field])
    .map((error) => ({
      field: API_TO_FORM_FIELD[error.field as string],
      message: error.message,
    }));
};
