export const SITE_NAME = "OrbitOps";
export const SITE_DESCRIPTION = "CRM, Sales, Marketing, Billing, Automation, Analytics and Ads Management unified into a single growth platform.";
export const pageRoutes = {
    home: "/",
    signin: "/auth/signin",
    signup: "/auth/signup",
    forgotPassword: "/auth/forgot-password",
    // Where the emailed reset link lands (token in the URL fragment).
    forgotPasswordReset: "/auth/forgot-password/reset",
    // Forced first-login reset for admin-issued temporary passwords.
    resetPassword: "/auth/reset-password",
    acceptInvite: "/auth/accept-invite",
    dashboard: "/dashboard",
    settingsTeam: "/settings/team",
    settingsSecurity: "/settings/security",
    settingsUsage: "/settings/usage",
    setup: "/setup",
    settingsIntegrations: "/settings/integrations",
    settingsTeamRoles: "/settings/team/roles",
    settingsTeamRoleNew: "/settings/team/roles/new",
    leads: "/leads",
    contacts: "/contacts",
    companies: "/companies",
    deals: "/deals",
    tasks: "/tasks",
    adsManagerOverview: "/ads-manager/overview",
    adsManagerCampaigns: "/ads-manager/campaigns",
    adsManagerAnalytics: "/ads-manager/analytics",
    adsManagerAssets: "/ads-manager/assets",
    adsManagerAccountCenter: "/ads-manager/account-center",
    growth: "/growth",
}

// Joins an org id/slug with a pageRoutes value. `route` already carries its
// own leading slash, so this must not add a second one between the two.
export const buildOrgRoute = (orgSlug: string, route: string) => `/${orgSlug}${route}`;

// NEXT_PUBLIC_ so it is inlined into the client bundle; falls back to the
// local backend for development. The API mounts every route under /api.
export const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:5000/api/";

// Public origin of this site. Social previews, canonical links and the sitemap
// need absolute URLs, so set this to the real domain in production.
export const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

// Full URL for an apiRoutes path, for callers outside the shared Axios client.
// Plain concatenation turned ".../api/" + "/auth/logout" into "//auth/logout",
// which the API answers with 404 — logout then silently did nothing.
export const apiUrl = (path: string) => `${API_BASE_URL.replace(/\/+$/, "")}/${path.replace(/^\/+/, "")}`;

export const apiRoutes = {
    getPricingPlans: "/admin/plan-lists",
    publicBookings: "/public/bookings",
    bookingAvailability: "/public/bookings/availability",
    login: "/auth/login",
    refreshToken: "/auth/refresh",
    logout: "/auth/logout",
    logoutAll: "/auth/logout-all",
    me: "/auth/me",
    resetPassword: "/auth/reset-password",
    changePassword: "/auth/change-password",
    forgotPassword: "/auth/password/forgot",
    resetPasswordWithToken: "/auth/password/reset",
    sessions: "/auth/sessions",
    appUsers: "/app/users",
    memberOptions: "/app/members/options",
    appRoles: "/app/roles",
    appPermissions: "/app/permissions",
    appTeams: "/app/teams",
    invitations: "/app/invitations",
    ownershipTransfer: "/app/ownership/transfer",
    teamAudit: "/app/team/audit",
    invitationPreview: "/auth/invitations/preview",
    invitationAccept: "/auth/invitations/accept",
    leads: "/leads",
    leadStatuses: "/leads/statuses",
    leadNotes: "/leads/notes",
    leadsExport: "/leads/export",
    contacts: "/contacts",
    contactNotes: "/contacts/notes",
    contactsExport: "/contacts/export",
    features: "/features",
    storageUsage: "/storage/usage",
    usage: "/app/usage",
    usageHeldLeads: "/app/usage/held-leads",
    notifications: "/app/notifications",
    // Multi-factor sign-in: the three sign-in steps take the short-lived MFA token,
    // the rest act on the signed-in member.
    mfaEnrollStart: "/auth/mfa/enroll/start",
    mfaEnrollConfirm: "/auth/mfa/enroll/confirm",
    mfaVerify: "/auth/mfa/verify",
    mfaStatus: "/auth/mfa",
    mfaSetupStart: "/auth/mfa/setup/start",
    mfaSetupConfirm: "/auth/mfa/setup/confirm",
    mfaDisable: "/auth/mfa/disable",
    mfaRecoveryCodes: "/auth/mfa/recovery-codes",
    mfaPolicy: "/app/security/mfa-policy",
    // First-login setup wizard and the organization logo.
    onboarding: "/app/onboarding",
    onboardingCompany: "/app/onboarding/company",
    onboardingLocale: "/app/onboarding/locale",
    onboardingLogo: "/app/onboarding/logo",
    onboardingComplete: "/app/onboarding/complete",
    organizationLogo: "/app/organization/logo",
    // Connecting Meta and Google ad accounts ("/{provider}/connect", "/{provider}/accounts", "/{provider}").
    adIntegrations: "/app/integrations/ads",
}
