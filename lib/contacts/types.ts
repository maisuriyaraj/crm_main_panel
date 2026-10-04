// Frontend shapes for the Contacts module. These stay camelCase and flat;
// `lib/contacts/mappers.ts` converts the backend's snake_case wire format into
// these on the way in, so no component needs to know about the API shape.
//
// A Contact deliberately carries no pipeline fields (stage, score, value,
// probability, temperature) — those belong to Lead.

export interface ContactOwner {
  id: string;
  fullName: string;
}

export interface Contact {
  id: string;
  firstName?: string;
  lastName?: string;
  fullName: string;
  email?: string;
  mobile?: string;
  alternateMobile?: string;
  companyName?: string;
  designation?: string;
  website?: string;
  description?: string;
  assignedTo?: string;
  sourceLeadId?: string;
  tags: string[];
  createdAt: string;
  updatedAt: string;
}

export interface ContactNote {
  id: string;
  contactId: string;
  note: string;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

export interface ContactsPagination {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

// Server-side query state. Unlike the Leads screen, which pulls 1000 rows and
// filters in the browser, every one of these is sent to the API.
export interface ContactListQuery {
  search?: string;
  assigned_to?: string;
  tag?: string;
  page?: number;
  limit?: number;
  sort_by?: "created_at" | "updated_at" | "full_name" | "company_name";
  sort_dir?: "ASC" | "DESC";
}

// A field-level validation failure from the API's 400 response.
export interface ApiFieldError {
  field: string | null;
  message: string;
}

export const resolveOwnerName = (owners: ContactOwner[], id?: string): string => {
  if (!id) return "Unassigned";
  return owners.find((owner) => owner.id === id)?.fullName ?? "Unknown";
};
