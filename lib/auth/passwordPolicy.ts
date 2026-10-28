import { z } from "zod";

// Mirrors the backend's passwordField (8-128 characters), used wherever a
// password is set: forced reset, email reset, change password, invitation.
export const PASSWORD_MIN = 8;
export const PASSWORD_MAX = 128;

export const newPasswordField = z
    .string()
    .min(PASSWORD_MIN, `Password must be at least ${PASSWORD_MIN} characters`)
    .max(PASSWORD_MAX, `Password must be at most ${PASSWORD_MAX} characters`);

// A new password plus its confirmation, matching.
export const newPasswordPairSchema = z
    .object({
        newPassword: newPasswordField,
        confirmPassword: z.string().min(1, "Please confirm your new password"),
    })
    .refine((values) => values.newPassword === values.confirmPassword, {
        message: "Passwords do not match",
        path: ["confirmPassword"],
    });

// Sign-in only requires a password to be present: accounts created before
// the length rule may still have shorter ones.
export const signInPasswordField = z.string().min(1, "Password is required").max(PASSWORD_MAX);
