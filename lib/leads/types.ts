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

export interface LeadStage {
  id: string;
  name: string;
  color: string;
  sortOrder: number;
  isWon?: boolean;
  isLost?: boolean;
}

export interface Lead {
  id: string;
  fullName: string;
  email?: string;
  mobile?: string;
  companyName?: string;
  designation?: string;
  website?: string;
  priority: LeadPriority;
  temperature: LeadTemperature;
  leadScore: number;
  value?: number;
  probability?: number;
  description?: string;
  statusId: string;
  assignedTo?: string;
  tags: string[];
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

// Matches the old demo-data.ts fallback behavior for an unresolved owner id.
export const resolveOwnerName = (owners: LeadOwner[], id?: string): string => {
  if (!id) return "Unknown";
  return owners.find((owner) => owner.id === id)?.fullName ?? "Unknown";
};
