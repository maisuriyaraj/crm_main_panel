export const SITE_NAME = "OrbitOps";
export const SITE_DESCRIPTION = "CRM, Sales, Marketing, Billing, Automation, Analytics and Ads Management unified into a single growth platform.";
export const pageRoutes = {
    home: "/",
    signin: "/auth/signin",
    signup: "/auth/signup",
    forgotPassword: "/auth/forgot-password",
    resetPassword: "/auth/reset-password",
    acceptInvite: "/auth/accept-invite",
    dashboard: "/dashboard",
    settingsTeam: "/settings/team",
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
// local backend for development.
export const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:5000";

export const apiRoutes = {
    getPricingPlans: "/admin/plan-lists",
    bookDemo:"/user/bookings",
    login: "/api/auth/login",
    refreshToken: "/api/auth/refresh",
    logout: "/api/auth/logout",
    logoutAll: "/api/auth/logout-all",
    me: "/api/auth/me",
    resetPassword: "/api/auth/reset-password",
    appUsers: "/api/app/users",
    memberOptions: "/api/app/members/options",
    appRoles: "/api/app/roles",
    invitations: "/api/app/invitations",
    ownershipTransfer: "/api/app/ownership/transfer",
    teamAudit: "/api/app/team/audit",
    invitationPreview: "/api/auth/invitations/preview",
    invitationAccept: "/api/auth/invitations/accept",
    leads: "/api/leads",
    leadStatuses: "/api/leads/statuses",
    leadNotes: "/api/leads/notes",
    contacts: "/api/contacts",
    contactNotes: "/api/contacts/notes",
}