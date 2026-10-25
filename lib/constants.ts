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
export const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:5000/";

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
    appUsers: "/app/users",
    memberOptions: "/app/members/options",
    appRoles: "/app/roles",
    invitations: "/app/invitations",
    ownershipTransfer: "/app/ownership/transfer",
    teamAudit: "/app/team/audit",
    invitationPreview: "/auth/invitations/preview",
    invitationAccept: "/auth/invitations/accept",
    leads: "/leads",
    leadStatuses: "/leads/statuses",
    leadNotes: "/leads/notes",
    contacts: "/contacts",
    contactNotes: "/contacts/notes",
}
