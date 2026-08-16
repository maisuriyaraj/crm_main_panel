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
}

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
}