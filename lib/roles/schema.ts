import { z } from "zod";

// Mirrors the backend's createRoleSchema/updateRoleSchema field rules, so the
// form catches the same mistakes before a request is sent. The API remains
// the authority and repeats every check.

export const MAX_CUSTOM_ROLES = 20;

const RESERVED_ROLE_NAMES = new Set(["owner", "super admin", "admin", "manager", "employee"]);

// Same normalization the API applies: trim and collapse inner whitespace.
export const normalizeRoleName = (value: string) => value.trim().replace(/\s+/g, " ");

export const roleFormSchema = z.object({
  name: z
    .string()
    .refine((value) => normalizeRoleName(value).length > 0, "Role name is required")
    .refine((value) => normalizeRoleName(value).length === 0 || normalizeRoleName(value).length >= 2, "Name must be at least 2 characters")
    .refine((value) => normalizeRoleName(value).length <= 50, "Name must be at most 50 characters")
    .refine((value) => !RESERVED_ROLE_NAMES.has(normalizeRoleName(value).toLowerCase()), "This name is reserved for a built-in role"),
  description: z.string().max(255, "Description must be at most 255 characters"),
});

export type RoleFormValues = z.infer<typeof roleFormSchema>;
