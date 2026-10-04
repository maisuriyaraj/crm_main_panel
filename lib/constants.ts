export const SITE_NAME = "OrbitOps";
export const SITE_DESCRIPTION = "CRM, Sales, Marketing, Billing, Automation, Analytics and Ads Management unified into a single growth platform.";
export const pageRoutes = {
    home: "/",
    signin: "/auth/signin",
    signup: "/auth/signup",
    forgotPassword: "/auth/forgot-password",
    resetPassword: "/auth/reset-password",
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
    leads: "/api/leads",
    leadStatuses: "/api/leads/statuses",
    leadNotes: "/api/leads/notes",
    contacts: "/api/contacts",
    contactNotes: "/api/contacts/notes",
}