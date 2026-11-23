import { Axios } from "@/lib/axios";
import { apiRoutes } from "@/lib/constants";
import { endImpersonatedSession, setImpersonating } from "@/lib/auth/session";

// A support session: OrbitOps staff signed in as a member of this workspace for
// at most 30 minutes, with every action recorded. The API never says which staff
// member it is, so `adminDisplay` is always the literal "OrbitOps support".
export interface ImpersonationSession {
    sessionId: string;
    expiresAt: string;
    adminDisplay: string;
}

type RawImpersonation = { session_id?: string; expires_at?: string; admin_display?: string } | null | undefined;

export const impersonationFrom = (raw: RawImpersonation): ImpersonationSession | null => {
    if (!raw || !raw.session_id || !raw.expires_at) return null;
    return {
        sessionId: raw.session_id,
        expiresAt: raw.expires_at,
        adminDisplay: raw.admin_display || "OrbitOps support",
    };
};

// Every refusal from the exchange is the same generic 400, so there is one
// sentence to show: a used, expired, unknown or already-ended code look alike.
export const EXCHANGE_FAILED_MESSAGE =
    "This link is no longer valid. Start again from the Master Admin panel.";

// Why a session stopped, in the words the API sends back on a 401.
export const END_REASONS: Record<string, string> = {
    ended_by_admin: "It was ended from the banner or the Master Admin panel.",
    expired: "It reached its 30-minute limit.",
    admin_deactivated: "The OrbitOps staff account behind it was closed.",
    admin_signed_out: "The OrbitOps staff member signed out of Master Admin.",
    target_removed: "The member being acted as is no longer active in this workspace.",
    organization_inactive: "This workspace is no longer active.",
    replaced: "Another support session was started for this staff member.",
    invalid: "The session could not be confirmed.",
};

export const endReasonText = (reason: string | null | undefined) =>
    (reason && END_REASONS[reason]) || "It is no longer active.";

// Shown when the server refuses an action a support session may never do
// (passwords, multi-factor settings, identity, sessions, ownership, API keys).
export const RESTRICTED_MESSAGE =
    "Support sessions can't do this. Ask someone in this workspace to do it themselves.";

// Redeems the single-use code from the link's fragment. The API sets the access
// cookie itself and issues no refresh token, so nothing is kept here: the code is
// used once, never stored and never logged.
export const exchangeImpersonationCode = async (code: string): Promise<ImpersonationSession | null> => {
    const response = await Axios.post(apiRoutes.impersonationExchange, { code });
    const session = impersonationFrom(response.data?.data?.impersonation);
    setImpersonating(true);
    return session;
};

// The banner's End session button. The answer does not matter much: either way
// this tab is finished, and the server has already closed the row if it replied.
export const endImpersonation = async () => {
    try {
        await Axios.post(apiRoutes.impersonationEnd);
    } finally {
        endImpersonatedSession("ended_by_admin");
    }
};
