// Frontend shapes for the Leads module. These stay camelCase and flat;
// `lib/leads/mappers.ts` converts the backend's snake_case wire format into
// these on the way in, so no component needs to know about the API shape.

export type LeadPriority = "low" | "medium" | "high" | "urgent";
export type LeadTemperature = "cold" | "warm" | "hot";
export type LeadActivityType = "call" | "email" | "meeting" | "note" | "whatsapp" | "sms" | "demo";

// Active / Closed / Dead. The API works this out from the stage the lead is on
// rather than storing it, so nothing here ever sets it.
export type LeadLifecycle = "active" | "closed" | "dead";

export const LIFECYCLE_LABEL: Record<LeadLifecycle, string> = {
  active: "Active",
  closed: "Closed",
  dead: "Dead",
};

// How the last call went. Set only by logging a call with its outcome.
export type LeadCallStatus = "none" | "not_answered" | "answered" | "follow_up";

export const CALL_STATUS_LABEL: Record<LeadCallStatus, string> = {
  none: "Never called",
  not_answered: "Not answered",
  answered: "Answered",
  follow_up: "Follow-up agreed",
};

// One entry of a tenant-owned picklist: a lead source or a lead channel. Source
// is where the lead came from; channel is how contact with it happens.
export interface LeadPicklistEntry {
  id: string;
  name: string;
  isActive: boolean;
  sortOrder: number;
}

export type LeadCustomFieldType = "text" | "number" | "date" | "picklist" | "checkbox";

export const CUSTOM_FIELD_TYPE_LABEL: Record<LeadCustomFieldType, string> = {
  text: "Text",
  number: "Number",
  date: "Date",
  picklist: "Choice list",
  checkbox: "Yes / no",
};

// A field this organization added to its own leads.
export interface LeadCustomFieldDefinition {
  id: string;
  key: string;
  label: string;
  fieldType: LeadCustomFieldType;
  // Only a choice list has these.
  options: string[];
  isRequired: boolean;
  sortOrder: number;
  active: boolean;
}

// What a lead holds for its organization's own fields, keyed by the field's key.
export type LeadCustomFieldValues = Record<string, string | number | boolean | null>;

// The campaign a lead came from. Read-only in this panel: nothing fills it in
// automatically until the lead-form integrations exist.
export interface LeadCampaignRef {
  id: string;
  name?: string;
  provider?: string;
}

// One lead the duplicate check matched, and which of its fields matched.
export interface DuplicateLeadMatch {
  id: string;
  fullName?: string;
  email?: string;
  mobile?: string;
  companyName?: string;
  stageName?: string;
  ownerName?: string;
  matchedOn: ("email" | "mobile")[];
}

export interface DuplicateLeadResult {
  isDuplicate: boolean;
  matches: DuplicateLeadMatch[];
  // True when a match exists that this member's role does not let them see. The
  // API deliberately says only that it exists, never which lead it is.
  hasHiddenMatches: boolean;
  total: number;
}

export interface LeadOwner {
  id: string;
  fullName: string;
}

// One board. An organization can run several; every lead sits on exactly one,
// and a lead's stage always belongs to its own pipeline.
export interface Pipeline {
  id: string;
  name: string;
  isDefault: boolean;
  sortOrder: number;
}

export interface LeadStage {
  id: string;
  name: string;
  color: string;
  sortOrder: number;
  isWon?: boolean;
  isLost?: boolean;
  // Moving a lead into this stage needs a reason, which only the dedicated
  // stage endpoint accepts — a plain field edit on the lead is refused.
  requiresReason?: boolean;
}

// What a stage does to a lead that enters it: nothing, or close it.
export type StageOutcome = "won" | "lost" | null;

export const stageOutcome = (stage?: LeadStage | null): StageOutcome => {
  if (!stage) return null;
  if (stage.isWon) return "won";
  if (stage.isLost) return "lost";
  return null;
};

export const OUTCOME_LABEL: Record<"won" | "lost", string> = {
  won: "Closed-Won",
  lost: "Closed-Lost",
};

export interface Lead {
  id: string;
  // A lead needs any one of a name, an email or a mobile, so this can be empty.
  // Use `leadDisplayName` wherever it is shown.
  fullName?: string;
  firstName?: string;
  lastName?: string;
  email?: string;
  mobile?: string;
  alternateMobile?: string;
  companyName?: string;
  designation?: string;
  website?: string;
  priority: LeadPriority;
  temperature: LeadTemperature;
  leadScore: number;
  value?: number;
  expectedBudget?: number;
  probability?: number;
  description?: string;
  statusId: string;
  pipelineId: string;
  assignedTo?: string;
  sourceId?: string;
  sourceName?: string;
  channelId?: string;
  channelName?: string;
  // Read-only here, and read from the stage rather than stored.
  lifecycle?: LeadLifecycle;
  address?: string;
  city?: string;
  state?: string;
  country?: string;
  pincode?: string;
  // A plain day, as YYYY-MM-DD.
  expectedCloseDate?: string;
  // A moment, as an ISO string.
  nextFollowupAt?: string;
  lastCallStatus: LeadCallStatus;
  adCampaignId?: string;
  adCampaign?: LeadCampaignRef;
  // Only the single-lead read carries these; list rows do not.
  customFields?: LeadCustomFieldValues;
  tags: string[];
  // Set once this lead has been converted into a contact. Undefined means it has
  // not been; a lead can only be converted once.
  convertedContactId?: string;
  createdAt: string;
  updatedAt: string;
  // Only on the Deleted leads view: until when this lead can be brought back.
  restoreDeadline?: string;
  canRestore?: boolean;
}

// What to call a lead on screen. A lead known only by a phone number has no
// name at all, and saying so is better than showing its number as its name.
export const NO_NAME = "No name";

export const leadDisplayName = (lead?: Pick<Lead, "fullName" | "firstName" | "lastName"> | null): string => {
  if (!lead) return NO_NAME;
  const joined = [lead.firstName, lead.lastName].filter(Boolean).join(" ").trim();
  return (lead.fullName ?? "").trim() || joined || NO_NAME;
};

// Whether a lead really has no name, so the screen can grey the label.
export const hasNoName = (lead?: Pick<Lead, "fullName" | "firstName" | "lastName"> | null): boolean =>
  leadDisplayName(lead) === NO_NAME;

export interface LeadActivity {
  id: string;
  leadId: string;
  activityType: LeadActivityType;
  subject: string;
  description?: string;
  createdBy: string;
  createdAt: string;
}

export interface LeadNote {
  id: string;
  leadId: string;
  note: string;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

// `owners` lists active members only, so an id that doesn't resolve belongs to
// someone who was suspended or removed after the record was assigned.
export const resolveOwnerName = (owners: LeadOwner[], id?: string): string => {
  if (!id) return "Unknown";
  return owners.find((owner) => owner.id === id)?.fullName ?? "Inactive member";
};
