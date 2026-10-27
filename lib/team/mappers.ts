// Converts the Team API's snake_case responses into the camelCase types in
// lib/team/types.ts. Ids are coerced to strings (the backend uses BIGINT ids).

import type {
  InvitationDelivery,
  InvitationPreview,
  MemberOption,
  MemberStatus,
  TeamApiError,
  TeamAuditEvent,
  TeamInvitation,
  TeamMember,
  TeamMemberDetail,
  PermissionModule,
  RoleInput,
  TeamRole,
  TeamRoleDetail,
  TeamRoleRef,
  TeamSummary,
} from "@/lib/team/types";

const toId = (value: unknown): string => String(value);
const optional = <T,>(value: T | null | undefined): T | undefined => (value === null ? undefined : value);

// Display name for a DB role name; the backend sends `label` where it can, but
// audit metadata only carries the raw name.
export const roleDisplayName = (name?: string | null) => (name === "Super Admin" ? "Owner" : name ?? "—");

export const mapMemberStatus = (status: string): MemberStatus =>
  status === "disabled" ? "suspended" : status === "invited" ? "invited" : "active";

const mapRoleRef = (raw: any): TeamRoleRef | null =>
  raw
    ? { id: toId(raw.id), name: raw.name, label: raw.label ?? roleDisplayName(raw.name), isAdmin: raw.is_admin === true }
    : null;

export const mapMemberFromApi = (raw: any): TeamMember => ({
  id: toId(raw.id),
  fullName: raw.full_name,
  email: raw.email,
  mobile: optional(raw.mobile),
  status: mapMemberStatus(raw.status),
  role: mapRoleRef(raw.role),
  createdAt: raw.created_at,
  lastLoginAt: optional(raw.last_login_at),
  isSelf: raw.is_self === true,
  allowedActions: Array.isArray(raw.allowed_actions) ? raw.allowed_actions : [],
});

export const mapMemberDetailFromApi = (raw: any): TeamMemberDetail => ({
  ...mapMemberFromApi(raw),
  invitedBy: raw.invited_by ? { id: toId(raw.invited_by.id), fullName: raw.invited_by.full_name } : undefined,
  suspendedAt: optional(raw.suspended_at),
  ownedRecords: {
    leads: Number(raw.owned_records?.leads ?? 0),
    contacts: Number(raw.owned_records?.contacts ?? 0),
  },
});

export const mapSummaryFromApi = (raw: any): TeamSummary => ({
  active: Number(raw?.active ?? 0),
  suspended: Number(raw?.suspended ?? 0),
  pendingInvitations: Number(raw?.pending_invitations ?? 0),
  seatsUsed: Number(raw?.seats_used ?? 0),
  seatsLimit: raw?.seats_limit === null || raw?.seats_limit === undefined ? null : Number(raw.seats_limit),
});

export const mapRoleFromApi = (raw: any): TeamRole => ({
  id: toId(raw.id),
  name: raw.name,
  label: raw.label ?? roleDisplayName(raw.name),
  description: optional(raw.description),
  isAdmin: raw.is_admin === true,
  rank: Number(raw.rank ?? 0),
  assignable: raw.assignable === true,
  isSystem: raw.is_system === true,
  systemKey: raw.system_key ?? null,
  editable: raw.editable === true,
  deletable: raw.deletable === true,
  memberCount: Number(raw.member_count ?? 0),
  pendingInvitationCount: Number(raw.pending_invitation_count ?? 0),
  permissionCount: Number(raw.permission_count ?? 0),
  version: Number(raw.version ?? 1),
  updatedAt: optional(raw.updated_at),
  permissions: Array.isArray(raw.permissions) ? raw.permissions : undefined,
});

const mapPerson = (raw: any) => (raw ? { id: toId(raw.id), fullName: raw.full_name } : undefined);

export const mapRoleDetailFromApi = (raw: any): TeamRoleDetail => ({
  ...mapRoleFromApi(raw),
  permissions: Array.isArray(raw.permissions) ? raw.permissions : [],
  createdBy: mapPerson(raw.created_by),
  updatedBy: mapPerson(raw.updated_by),
  createdAt: optional(raw.created_at),
});

export const mapPermissionCatalogFromApi = (raw: any): PermissionModule[] =>
  (Array.isArray(raw?.modules) ? raw.modules : []).map((group: any) => ({
    module: group.module,
    label: group.label,
    status: group.status === "planned" ? "planned" : "live",
    permissions: (group.permissions ?? []).map((p: any) => ({
      key: p.key,
      label: p.label,
      description: p.description ?? "",
      requires: Array.isArray(p.requires) ? p.requires : [],
      reserved: p.reserved === true,
    })),
  }));

// Body for POST/PATCH /app/roles. The API rejects unknown fields, so only these go.
export const roleInputToApi = (input: RoleInput) => ({
  name: input.name,
  description: input.description,
  permissions: input.permissions,
});

export const mapInvitationFromApi = (raw: any): TeamInvitation => ({
  id: toId(raw.id),
  email: raw.email,
  fullName: optional(raw.full_name),
  role: mapRoleRef(raw.role),
  status: raw.status,
  invitedBy: raw.invited_by ? { id: toId(raw.invited_by.id), fullName: raw.invited_by.full_name } : undefined,
  expiresAt: raw.expires_at ?? null,
  lastSentAt: raw.last_sent_at,
  sendCount: Number(raw.send_count ?? 0),
  deliveryStatus: raw.delivery_status,
  source: raw.source === "legacy" ? "legacy" : "invitation",
  createdAt: raw.created_at,
  allowedActions: Array.isArray(raw.allowed_actions) ? raw.allowed_actions : [],
});

export const mapDeliveryFromApi = (raw: any): InvitationDelivery => ({
  invitation: mapInvitationFromApi(raw.invitation),
  delivery: raw.delivery,
  inviteUrl: optional(raw.invite_url),
});

export const mapAuditEventFromApi = (raw: any): TeamAuditEvent => ({
  id: toId(raw.id),
  action: raw.action,
  actor: raw.actor ? { id: toId(raw.actor.id), fullName: raw.actor.full_name ?? null } : null,
  targetType: raw.target_type,
  target: raw.target ? { id: toId(raw.target.id), label: raw.target.label ?? null } : null,
  metadata: raw.metadata ?? {},
  createdAt: raw.created_at,
});

export const mapMemberOptionFromApi = (raw: any): MemberOption => ({
  id: toId(raw.id),
  fullName: raw.full_name,
});

export const mapInvitationPreviewFromApi = (raw: any): InvitationPreview => ({
  organization: { id: toId(raw.organization.id), name: raw.organization.name },
  inviterName: optional(raw.inviter_name),
  roleName: raw.role_name,
  email: raw.email,
  fullName: optional(raw.full_name),
  isLegacy: raw.is_legacy === true,
  expiresAt: raw.expires_at,
});

// Normalizes an Axios error from any Team endpoint.
export const toTeamApiError = (error: any, fallback: string): TeamApiError => ({
  message: error?.response?.data?.message || fallback,
  code: error?.response?.data?.code,
  status: error?.response?.status,
  errors: error?.response?.data?.errors,
  data: error?.response?.data?.data,
});

// Maps API field names in a 400 `errors` array onto form field names.
export const mapTeamFieldErrors = (errors: TeamApiError["errors"], fields: Record<string, string>) =>
  (Array.isArray(errors) ? errors : [])
    .filter((error) => error.field && fields[error.field])
    .map((error) => ({ field: fields[error.field as string], message: error.message }));

const nameOr = (value: string | null | undefined, fallback: string) => (value && value.trim() ? value : fallback);

const plural = (count: number, word: string) => `${count} ${word}${count === 1 ? "" : "s"}`;

const describeRoleUpdate = (meta: Record<string, any>) => {
  const parts: string[] = [];
  if (meta.name) parts.push(`renamed it from ${meta.name.from} to ${meta.name.to}`);
  if (meta.permissions) {
    const added = meta.permissions.added?.length ?? 0;
    const removed = meta.permissions.removed?.length ?? 0;
    if (added) parts.push(`added ${plural(added, "permission")}`);
    if (removed) parts.push(`removed ${plural(removed, "permission")}`);
  }
  if (meta.description_changed) parts.push("changed its description");
  return parts.length ? ` (${parts.join(", ")})` : "";
};

const DENIED_ATTEMPTS: Record<string, string> = {
  create_role: "creating a role",
  update_role: "changing a role",
  assign_role: "assigning a role",
  change_role: "changing a role",
};

// One readable line per audit event for the Activity tab.
export const describeAuditEvent = (event: TeamAuditEvent): string => {
  const actor = nameOr(event.actor?.fullName, event.actor ? "A former member" : "System");
  const target = nameOr(event.target?.label, event.targetType === "role" ? "a deleted role" : "a former member");
  const meta = event.metadata ?? {};
  const email = meta.email ?? target;

  switch (event.action) {
    case "team.invitation.created":
      return `${actor} invited ${email} as ${roleDisplayName(meta.role)}`;
    case "team.invitation.resent":
      return `${actor} resent the invitation to ${email}`;
    case "team.invitation.revoked":
      return event.actor ? `${actor} revoked the invitation for ${email}` : `The invitation for ${email} was revoked`;
    case "team.invitation.accepted":
      return `${actor} joined as ${roleDisplayName(meta.role)}`;
    case "team.invitation.expired":
      return `The invitation for ${email} expired`;
    case "team.member.role_changed":
      return `${actor} changed ${target}'s role from ${roleDisplayName(meta.from_role)} to ${roleDisplayName(meta.to_role)}`;
    case "team.member.suspended":
      return `${actor} suspended ${target}${meta.reason ? ` (${meta.reason})` : ""}`;
    case "team.member.reactivated":
      return `${actor} reactivated ${target}`;
    case "team.member.removed":
      return `${actor} removed ${meta.email ?? target} from the team`;
    case "team.member.profile_updated":
      return `${actor} updated ${target}'s profile`;
    case "team.member.sessions_revoked":
      return `${actor} signed ${target} out of all devices`;
    case "team.ownership.transferred":
      return `${actor} made ${target} an owner`;
    case "team.role.created":
      return `${actor} created the role ${target}`;
    case "team.role.updated":
      return `${actor} changed the role ${target}${describeRoleUpdate(meta)}`;
    case "team.role.deleted":
      return `${actor} deleted the role ${meta.name ?? target}`;
    case "team.authz.denied":
      return DENIED_ATTEMPTS[meta.attempted]
        ? `${actor} was blocked from ${DENIED_ATTEMPTS[meta.attempted]}`
        : `${actor} was blocked from an action on ${event.target?.label ?? "the team"}`;
    default:
      return `${actor} · ${event.action}`;
  }
};
