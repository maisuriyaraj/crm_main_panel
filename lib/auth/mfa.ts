import { Axios } from "@/lib/axios";
import { apiRoutes } from "@/lib/constants";

// Multi-factor sign-in calls. These are plain functions on the shared client, not
// Redux thunks, on purpose: a thunk's argument and result are copied into every
// dispatched action (and the Redux devtools log), and the MFA token, the TOTP
// secret and the recovery codes must live only in the screen that shows them.
// Nothing here logs or stores anything.

// What a correct password answers when a second factor is needed. No session yet.
export type MfaChallenge = { mfaToken: string; enrollmentRequired: boolean };

export type Enrollment = {
    otpauth_url: string;
    secret: string;
    issuer: string;
    account: string;
    algorithm: string;
    digits: number;
    period: number;
};

export type MfaStatus = {
    enabled: boolean;
    enabled_at: string | null;
    recovery_codes_left: number;
    organization_requires: boolean;
};

export type MfaPolicy = {
    mfa_required: boolean;
    changed_at: string | null;
    members_without_mfa: number;
};

export type MfaCode = { code: string } | { recovery_code: string };

// Any sign-in-like answer (login, invitation, forced password reset, password
// change) may be the MFA step instead of a session.
export const challengeFrom = (body: unknown): MfaChallenge | null => {
    const data = (body as { data?: { mfa_required?: boolean; enrollment_required?: boolean; mfa_token?: string } } | undefined)?.data
        ?? (body as { mfa_required?: boolean; enrollment_required?: boolean; mfa_token?: string } | undefined);
    if (!data?.mfa_required || typeof data.mfa_token !== "string") return null;
    return { mfaToken: data.mfa_token, enrollmentRequired: !!data.enrollment_required };
};

const withToken = (mfaToken: string) => ({ headers: { Authorization: `Bearer ${mfaToken}` } });

// ─── Sign-in steps (MFA token) ───────────────────────────────────────────────

export const startEnrollment = async (mfaToken: string): Promise<Enrollment> =>
    (await Axios.post(apiRoutes.mfaEnrollStart, {}, withToken(mfaToken))).data.data;

// Sets the session cookies. The access token in the body is not kept: the
// HttpOnly cookie is the only copy the browser needs.
export const confirmEnrollment = async (mfaToken: string, code: string): Promise<string[]> =>
    (await Axios.post(apiRoutes.mfaEnrollConfirm, { code }, withToken(mfaToken))).data.data.recovery_codes;

export const verifySignIn = async (mfaToken: string, body: MfaCode): Promise<void> => {
    await Axios.post(apiRoutes.mfaVerify, body, withToken(mfaToken));
};

// ─── Your own MFA (signed in) ────────────────────────────────────────────────

export const getMfaStatus = async (): Promise<MfaStatus> => (await Axios.get(apiRoutes.mfaStatus)).data.data;

export const startSetup = async (): Promise<Enrollment> => (await Axios.post(apiRoutes.mfaSetupStart, {})).data.data;

export const confirmSetup = async (code: string): Promise<string[]> =>
    (await Axios.post(apiRoutes.mfaSetupConfirm, { code })).data.data.recovery_codes;

export const disableMfa = async (code: string): Promise<void> => {
    await Axios.post(apiRoutes.mfaDisable, { code });
};

export const regenerateRecoveryCodes = async (code: string): Promise<string[]> =>
    (await Axios.post(apiRoutes.mfaRecoveryCodes, { code })).data.data.recovery_codes;

// ─── The organization's rule and resets (team admins) ───────────────────────

export const getMfaPolicy = async (): Promise<MfaPolicy> => (await Axios.get(apiRoutes.mfaPolicy)).data.data;

export const setMfaPolicy = async (required: boolean): Promise<MfaPolicy> =>
    (await Axios.put(apiRoutes.mfaPolicy, { mfa_required: required })).data.data;

export const resetMemberMfa = async (memberId: string, reason?: string): Promise<void> => {
    await Axios.post(`${apiRoutes.appUsers}/${memberId}/mfa/reset`, reason ? { reason } : {});
};

// ─── Recovery codes, kept in the browser ─────────────────────────────────────

export const recoveryCodesText = (codes: string[]) =>
    `OrbitOps recovery codes\nEach code signs you in once. Keep them somewhere safe.\n\n${codes.join("\n")}\n`;

export const downloadRecoveryCodes = (codes: string[]) => {
    const url = URL.createObjectURL(new Blob([recoveryCodesText(codes)], { type: "text/plain" }));
    const link = document.createElement("a");
    link.href = url;
    link.download = "orbitops-recovery-codes.txt";
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
};
