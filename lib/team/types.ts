// Frontend shapes for Team management. `lib/team/mappers.ts` converts the
// backend's snake_case wire format into these, so no component needs to know
// about the API shape. Ids are strings, as in the Leads and Contacts modules.

// The API stores a suspended member as status "disabled"; the UI calls it
// "suspended". A legacy temporary-password user is "invited".
export type MemberStatus = "active" | "suspended" | "invited";

export type MemberAction =
  | "edit_profile"
  | "change_role"
  | "suspend"
  | "reactivate"
  | "revoke_sessions"
  | "remove"
  | "transfer_ownership"
  | "resend_invite";

export interface TeamRoleRef {
  id: string;
  name: string;
  label: string;
  isAdmin: boolean;
}

export interface TeamMember {
  id: string;
  fullName: string;
  email: string;
  mobile?: string;
  status: MemberStatus;
  role: TeamRoleRef | null;
  createdAt: string;
  lastLoginAt?: string;
  isSelf: boolean;
  allowedActions: MemberAction[];
}

export interface TeamMemberDetail extends TeamMember {
  invitedBy?: { id: string; fullName: string };
  suspendedAt?: string;
  ownedRecords: { leads: number; contacts: number };
}

export interface TeamSummary {
  active: number;
  suspended: number;
  pendingInvitations: number;
  seatsUsed: number;
  seatsLimit: number | null;
}

export interface TeamRole {
  id: string;
  name: string;
  label: string;
  description?: string;
  isAdmin: boolean;
  rank: number;
  assignable: boolean;
}

export type InvitationStatus = "pending" | "accepted" | "revoked" | "expired";
export type InvitationDeliveryStatus = "link_only" | "sent" | "failed";

export interface TeamInvitation {
  id: string;
  email: string;
  fullName?: string;
  role: TeamRoleRef | null;
  status: InvitationStatus;
  invitedBy?: { id: string; fullName: string };
  expiresAt: string | null;
  lastSentAt: string;
  sendCount: number;
  deliveryStatus: InvitationDeliveryStatus;
  // "legacy" rows are users from the old temporary-password flow; their id is
  // the user id and they are resent/revoked through different endpoints.
  source: "invitation" | "legacy";
  createdAt: string;
  allowedActions: Array<"resend" | "revoke">;
}

export interface InvitationDelivery {
  invitation: TeamInvitation;
  delivery: InvitationDeliveryStatus;
  inviteUrl?: string;
}

export interface TeamAuditEvent {
  id: string;
  action: string;
  actor: { id: string; fullName: string | null } | null;
  targetType: string;
  target: { id: string; label: string | null } | null;
  metadata: Record<string, any>;
  createdAt: string;
}

export interface MemberOption {
  id: string;
  fullName: string;
}

export interface TeamPagination {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface InvitationPreview {
  organization: { id: string; name: string };
  inviterName?: string;
  roleName: string;
  email: string;
  fullName?: string;
  isLegacy: boolean;
  expiresAt: string;
}

export interface MemberListQuery {
  page: number;
  limit: number;
  search?: string;
  status?: "active" | "suspended";
  role_id?: string;
  sort?: "full_name" | "created_at" | "last_login_at" | "role" | "status";
  order?: "asc" | "desc";
}

export interface InvitationListQuery {
  status: InvitationStatus;
  page: number;
  limit: number;
  search?: string;
}

export interface TeamApiError {
  message: string;
  code?: string;
  status?: number;
  errors?: Array<{ field: string | null; message: string }>;
  data?: Record<string, any>;
}
