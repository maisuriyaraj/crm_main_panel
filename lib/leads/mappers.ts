// Converts the backend Leads API's snake_case response shape (see
// backend/specs/leads/leads-api.md) into this app's camelCase Lead/LeadStage/
// LeadActivity/LeadNote types, and the reverse for outgoing write bodies.
// Every id is coerced to a string here since the backend uses numeric
// (BIGINT) primary keys but every existing Leads component treats ids as
// strings (Set<string> selection, string equality checks, etc).

import type {
  DuplicateLeadMatch,
  DuplicateLeadResult,
  Lead,
  LeadActivity,
  LeadActivityType,
  LeadCallStatus,
  LeadCustomFieldDefinition,
  LeadCustomFieldType,
  LeadCustomFieldValues,
  LeadLifecycle,
  LeadNote,
  LeadPicklistEntry,
  LeadPriority,
  LeadStage,
  LeadTemperature,
  Pipeline,
} from "@/lib/leads/types";

const toStringId = (value: unknown): string | undefined =>
  value === null || value === undefined ? undefined : String(value);

const toNumber = (value: unknown): number | undefined => {
  if (value === null || value === undefined || value === "") return undefined;
  const parsed = Number(value);
  return Number.isNaN(parsed) ? undefined : parsed;
};

const toText = (value: unknown): string | undefined =>
  value === null || value === undefined || value === "" ? undefined : String(value);

export const mapLeadFromApi = (raw: any): Lead => ({
  id: String(raw.id),
  // A lead may genuinely have no name; `leadDisplayName` decides what to show.
  fullName: toText(raw.full_name),
  firstName: raw.first_name ?? undefined,
  lastName: raw.last_name ?? undefined,
  email: raw.email ?? undefined,
  mobile: raw.mobile ?? undefined,
  alternateMobile: raw.alternate_mobile ?? undefined,
  companyName: raw.company_name ?? undefined,
  designation: raw.designation ?? undefined,
  website: raw.website ?? undefined,
  priority: raw.priority as LeadPriority,
  temperature: raw.temperature as LeadTemperature,
  leadScore: toNumber(raw.lead_score) ?? 0,
  value: toNumber(raw.value),
  expectedBudget: toNumber(raw.expected_budget),
  probability: toNumber(raw.probability),
  description: raw.description ?? undefined,
  statusId: toStringId(raw.status_id) ?? "",
  pipelineId: toStringId(raw.pipeline_id) ?? "",
  assignedTo: toStringId(raw.assigned_to),
  sourceId: toStringId(raw.source_id),
  sourceName: raw.source?.name ?? undefined,
  channelId: toStringId(raw.channel_id),
  channelName: raw.channel?.name ?? undefined,
  lifecycle: (raw.lifecycle as LeadLifecycle) ?? undefined,
  address: toText(raw.address),
  city: toText(raw.city),
  state: toText(raw.state),
  country: toText(raw.country),
  pincode: toText(raw.pincode),
  expectedCloseDate: toText(raw.expected_close_date),
  nextFollowupAt: toText(raw.next_followup_at),
  lastCallStatus: (raw.last_call_status as LeadCallStatus) ?? "none",
  adCampaignId: toStringId(raw.ad_campaign_id),
  adCampaign: raw.ad_campaign
    ? {
        id: String(raw.ad_campaign.id),
        name: toText(raw.ad_campaign.name),
        provider: toText(raw.ad_campaign.provider),
      }
    : undefined,
  // Only a single-lead read carries these; a list row leaves them undefined,
  // which is different from a lead that has none.
  customFields: raw.custom_fields ? (raw.custom_fields as LeadCustomFieldValues) : undefined,
  tags: Array.isArray(raw.tags) ? raw.tags.map((tag: any) => tag.name) : [],
  convertedContactId: toStringId(raw.converted_contact_id),
  createdAt: raw.created_at,
  updatedAt: raw.updated_at,
  restoreDeadline: toText(raw.restore_deadline),
  canRestore: raw.can_restore === undefined ? undefined : raw.can_restore === true,
});

// A lead source or a lead channel: the two have the same shape on the wire.
export const mapLeadPicklistFromApi = (raw: any): LeadPicklistEntry => ({
  id: String(raw.id),
  name: raw.name,
  isActive: raw.is_active !== false,
  sortOrder: raw.sort_order ?? 0,
});

export const mapCustomFieldFromApi = (raw: any): LeadCustomFieldDefinition => ({
  id: String(raw.id),
  key: raw.key,
  label: raw.label,
  fieldType: raw.field_type as LeadCustomFieldType,
  options: Array.isArray(raw.options) ? raw.options.map((option: any) => String(option)) : [],
  isRequired: raw.is_required === true,
  sortOrder: raw.sort_order ?? 0,
  active: raw.active !== false,
});

const mapDuplicateMatchFromApi = (raw: any): DuplicateLeadMatch => ({
  id: String(raw.id),
  fullName: toText(raw.full_name),
  email: toText(raw.email),
  mobile: toText(raw.mobile),
  companyName: toText(raw.company_name),
  stageName: raw.status?.name ?? undefined,
  ownerName: raw.assignee?.full_name ?? undefined,
  matchedOn: Array.isArray(raw.matched_on) ? raw.matched_on : [],
});

// Used both for the check the form runs and for the 409 body a refused create
// sends back, which carry the same two keys.
export const mapDuplicateResultFromApi = (raw: any): DuplicateLeadResult => {
  const matches = Array.isArray(raw?.matches) ? raw.matches.map(mapDuplicateMatchFromApi) : [];
  return {
    matches,
    hasHiddenMatches: raw?.has_hidden_matches === true,
    total: toNumber(raw?.total) ?? matches.length,
    isDuplicate: raw?.is_duplicate === true || matches.length > 0 || raw?.has_hidden_matches === true,
  };
};

export const mapLeadStatusFromApi = (raw: any): LeadStage => ({
  id: String(raw.id),
  name: raw.name,
  color: raw.color ?? "var(--muted-foreground)",
  sortOrder: raw.sort_order ?? 0,
  isWon: !!raw.is_won,
  isLost: !!raw.is_lost,
  requiresReason: !!raw.requires_reason,
});

export const mapPipelineFromApi = (raw: any): Pipeline => ({
  id: String(raw.id),
  name: raw.name,
  isDefault: !!raw.is_default,
  sortOrder: raw.sort_order ?? 0,
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
  fullName?: string;
  firstName?: string;
  lastName?: string;
  companyName?: string;
  email?: string;
  mobile?: string;
  alternateMobile?: string;
  designation?: string;
  website?: string;
  priority: LeadPriority;
  temperature: LeadTemperature;
  statusId: string;
  // Which board the lead goes on. The screen supplies the pipeline it is
  // showing; the API falls back to the organization's default without it.
  pipelineId?: string;
  assignedTo?: string;
  sourceId?: string;
  channelId?: string;
  value?: string;
  probability?: string;
  leadScore?: string;
  expectedCloseDate?: string;
  // From a datetime-local input, so it has no time zone of its own.
  nextFollowupAt?: string;
  address?: string;
  city?: string;
  state?: string;
  country?: string;
  pincode?: string;
  description?: string;
  tags: string[];
  customFields?: Record<string, string | number | boolean | null>;
}

// A `datetime-local` value is wall-clock time with no zone. The API wants an
// offset, so the browser's own zone is what the person meant.
const toIsoMoment = (value?: string): string | undefined => {
  if (!value) return undefined;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? undefined : parsed.toISOString();
};

// An empty string clears a field, so it is sent as null rather than dropped:
// `undefined` would leave the stored value untouched on a PATCH.
const orNull = (value?: string) => (value && value.trim() !== "" ? value.trim() : null);

export const mapLeadPayloadToApi = (values: LeadFormPayload) => ({
  // A lead needs any one of a name, an email or a mobile, so the name may be
  // cleared outright.
  full_name: orNull(values.fullName),
  // Sent even when empty, so clearing a first or last name really clears it.
  // The API only works a name out from these two when no `full_name` is sent,
  // and this always sends one, so nothing is derived behind the member's back.
  first_name: values.firstName === undefined ? undefined : values.firstName.trim(),
  last_name: values.lastName === undefined ? undefined : values.lastName.trim(),
  company_name: orNull(values.companyName),
  email: orNull(values.email),
  mobile: orNull(values.mobile),
  alternate_mobile: orNull(values.alternateMobile),
  designation: orNull(values.designation),
  website: orNull(values.website),
  priority: values.priority,
  temperature: values.temperature,
  status_id: values.statusId,
  pipeline_id: values.pipelineId || undefined,
  assigned_to: values.assignedTo || null,
  source_id: values.sourceId || null,
  channel_id: values.channelId || null,
  value: toNumber(values.value) ?? null,
  probability: toNumber(values.probability) ?? null,
  lead_score: toNumber(values.leadScore) ?? 0,
  expected_close_date: orNull(values.expectedCloseDate),
  next_followup_at: toIsoMoment(values.nextFollowupAt) ?? null,
  address: orNull(values.address),
  city: orNull(values.city),
  state: orNull(values.state),
  country: orNull(values.country),
  pincode: orNull(values.pincode),
  description: orNull(values.description),
  tags: values.tags,
  ...(values.customFields ? { custom_fields: values.customFields } : {}),
});
