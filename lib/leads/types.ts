// Frontend shapes for the Leads module. These stay camelCase and flat;
// `lib/leads/mappers.ts` converts the backend's snake_case wire format into
// these on the way in, so no component needs to know about the API shape.

export type LeadPriority = "low" | "medium" | "high" | "urgent";
export type LeadTemperature = "cold" | "warm" | "hot";
export type LeadActivityType = "call" | "email" | "meeting" | "note" | "whatsapp" | "sms" | "demo";

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
  fullName: string;
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
  tags: string[];
  // Set once this lead has been converted into a contact. Undefined means it has
  // not been; a lead can only be converted once.
  convertedContactId?: string;
  createdAt: string;
  updatedAt: string;
}

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
