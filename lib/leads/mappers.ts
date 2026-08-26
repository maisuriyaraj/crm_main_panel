// Converts the backend Leads API's snake_case response shape (see
// backend/specs/leads/leads-api.md) into this app's camelCase Lead/LeadStage/
// LeadActivity/LeadNote types, and the reverse for outgoing write bodies.
// Every id is coerced to a string here since the backend uses numeric
// (BIGINT) primary keys but every existing Leads component treats ids as
// strings (Set<string> selection, string equality checks, etc).

import type {
  Lead,
  LeadActivity,
  LeadActivityType,
  LeadNote,
  LeadPriority,
  LeadStage,
  LeadTemperature,
} from "@/lib/leads/types";

const toStringId = (value: unknown): string | undefined =>
  value === null || value === undefined ? undefined : String(value);

const toNumber = (value: unknown): number | undefined => {
  if (value === null || value === undefined || value === "") return undefined;
  const parsed = Number(value);
  return Number.isNaN(parsed) ? undefined : parsed;
};

export const mapLeadFromApi = (raw: any): Lead => ({
  id: String(raw.id),
  fullName: raw.full_name,
  email: raw.email ?? undefined,
  mobile: raw.mobile ?? undefined,
  companyName: raw.company_name ?? undefined,
  designation: raw.designation ?? undefined,
  website: raw.website ?? undefined,
  priority: raw.priority as LeadPriority,
  temperature: raw.temperature as LeadTemperature,
  leadScore: toNumber(raw.lead_score) ?? 0,
  value: toNumber(raw.value),
  probability: toNumber(raw.probability),
  description: raw.description ?? undefined,
  statusId: toStringId(raw.status_id) ?? "",
  assignedTo: toStringId(raw.assigned_to),
  tags: Array.isArray(raw.tags) ? raw.tags.map((tag: any) => tag.name) : [],
  createdAt: raw.created_at,
  updatedAt: raw.updated_at,
});

export const mapLeadStatusFromApi = (raw: any): LeadStage => ({
  id: String(raw.id),
  name: raw.name,
  color: raw.color ?? "var(--muted-foreground)",
  sortOrder: raw.sort_order ?? 0,
  isWon: !!raw.is_won,
  isLost: !!raw.is_lost,
});

export const mapLeadActivityFromApi = (raw: any): LeadActivity => ({
  id: String(raw.id),
  leadId: String(raw.lead_id),
  activityType: raw.activity_type as LeadActivityType,
  subject: raw.subject,
  description: raw.description ?? undefined,
  createdBy: toStringId(raw.created_by) ?? "",
  createdAt: raw.created_at,
});

export const mapLeadNoteFromApi = (raw: any): LeadNote => ({
  id: String(raw.id),
  leadId: String(raw.lead_id),
  note: raw.note,
  createdBy: toStringId(raw.uploaded_by) ?? "",
  createdAt: raw.created_at,
  updatedAt: raw.updated_at,
});

// Input shape matches `LeadFormValues` (components/leads/lead-form-dialog.tsx)
// field-for-field, kept structural here to avoid a circular import.
interface LeadFormPayload {
  fullName: string;
  companyName?: string;
  email?: string;
  mobile?: string;
  designation?: string;
  website?: string;
  priority: LeadPriority;
  temperature: LeadTemperature;
  statusId: string;
  assignedTo?: string;
  value?: string;
  probability?: string;
  leadScore?: string;
  description?: string;
  tags: string[];
}

export const mapLeadPayloadToApi = (values: LeadFormPayload) => ({
  full_name: values.fullName,
  company_name: values.companyName || undefined,
  email: values.email || undefined,
  mobile: values.mobile || undefined,
  designation: values.designation || undefined,
  website: values.website || undefined,
  priority: values.priority,
  temperature: values.temperature,
  status_id: values.statusId,
  assigned_to: values.assignedTo || undefined,
  value: toNumber(values.value),
  probability: toNumber(values.probability),
  lead_score: toNumber(values.leadScore) ?? 0,
  description: values.description || undefined,
  tags: values.tags,
});
