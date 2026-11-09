// Turns an auth API failure into the sentence to show. The backend's `code`
// decides, never its message text; anything unrecognised falls back to the
// caller's default so no raw server message reaches the screen.
type ApiError = { response?: { status?: number; data?: { code?: string; message?: string } }; code?: string };

export const authErrorMessage = (error: unknown, fallback: string): string => {
    const err = error as ApiError | undefined;
    const status = err?.response?.status;
    const code = err?.response?.data?.code;

    if (!err?.response) return "Can't reach the server. Check your connection and try again.";
    if (status === 429 || code === "TOO_MANY_ATTEMPTS") {
        return "Too many attempts. Please wait a few minutes and try again.";
    }
    if (code === "ACCOUNT_DISABLED") return "This account is disabled. Contact your workspace admin.";
    if (code === "VALIDATION_ERROR" || code === "RESET_TOKEN_INVALID") {
        return err.response.data?.message || fallback;
    }
    if (status && status >= 500) return "Something went wrong on our side. Please try again.";
    return fallback;
};

// Plain words for every code the sign-in, MFA, team security and setup screens
// can get back. Screens show these, never the server's own message text.
export const API_ERROR_MESSAGES: Record<string, string> = {
    // Multi-factor sign-in
    INVALID_CODE: "That code didn't work. Check your authenticator app and try again; each code works only once.",
    TOO_MANY_ATTEMPTS: "Too many attempts. Please wait a few minutes and try again.",
    MFA_TOKEN_INVALID: "Your sign-in step expired. Please sign in again.",
    MFA_TOKEN_MISSING: "Your sign-in step expired. Please sign in again.",
    MFA_WRONG_STEP: "This sign-in step doesn't match your account any more. Please sign in again.",
    MFA_ALREADY_ENABLED: "Multi-factor sign-in is already on for your account.",
    MFA_NOT_ENABLED: "Multi-factor sign-in is not on for your account.",
    ENROLLMENT_NOT_STARTED: "The setup expired. Start again to get a new QR code.",
    MFA_REQUIRED_BY_ORGANIZATION: "Your organization requires multi-factor sign-in, so you can't turn it off.",
    ACCOUNT_DISABLED: "This account is disabled. Contact your workspace admin.",
    // Acting on another member
    CANNOT_RESET: "You can't reset this member's MFA: they have permissions you don't have.",
    SELF_ACTION_NOT_ALLOWED: "You can't do this to your own account.",
    TARGET_NOT_MANAGEABLE: "You can't manage this member.",
    PERMISSION_DENIED: "You don't have permission to do this.",
    FORBIDDEN: "You don't have permission to do this.",
    SEAT_LIMIT_REACHED: "You've used every seat on your plan. Remove a member or contact OrbitOps to add seats.",
    // Session and subscription
    SESSION_REVOKED: "Your session has ended. Please sign in again.",
    TOKEN_INVALID: "Your session has ended. Please sign in again.",
    SUBSCRIPTION_INACTIVE: "Your subscription has ended. Renew it to use this part of OrbitOps.",
    // Setup wizard and logo
    VALIDATION_FAILED: "Some details need fixing. Check the highlighted fields.",
    FILE_REQUIRED: "Choose an image to upload.",
    FILE_EMPTY: "That file is empty. Choose another image.",
    FILE_TOO_LARGE: "That image is too large. Choose a smaller one.",
    FILE_TYPE_NOT_ALLOWED: "That file type isn't allowed. Use a JPG, PNG, GIF or WebP image.",
    FILE_TYPE_MISMATCH: "That file's name doesn't match what it contains. Save it again as a JPG, PNG, GIF or WebP image.",
    LOGO_NOT_IMAGE: "The logo must be an image: JPG, PNG, GIF or WebP.",
    LOGO_NOT_FOUND: "Your organization has no logo yet.",
    STORAGE_NOT_CONFIGURED: "Uploads are not available right now. You can skip this step and add a logo later.",
    STEP_NOT_FOUND: "That setup step doesn't exist.",
    STEP_NOT_AVAILABLE: "This step isn't available yet.",
    STEP_ALREADY_DONE: "This step is already done.",
    ONBOARDING_ALREADY_COMPLETED: "Setup has already been finished for your organization.",
    ORGANIZATION_NOT_FOUND: "We couldn't find your organization. Please sign in again.",
    // Ad account connections (also the codes the provider callback sends back)
    PROVIDER_NOT_CONFIGURED: "OrbitOps hasn't set up this connection yet. It will be available soon.",
    PROVIDER_CONFIG_UNREADABLE: "This connection isn't working on our side right now. Please contact OrbitOps.",
    PROVIDER_NOT_FOUND: "That ad platform isn't supported.",
    FEATURE_DISABLED: "This isn't part of your plan.",
    NOT_CONNECTED: "This ad platform isn't connected.",
    UNKNOWN_ACCOUNT: "Some of those accounts aren't in this connection any more. Reload and choose again.",
    MANAGER_ACCOUNT: "A manager account holds no ads of its own. Choose the accounts under it.",
    STATE_INVALID: "That connection link didn't work or was already used. Please connect again.",
    BROWSER_MISMATCH: "Finish connecting in the same browser where you clicked Connect. Please connect again.",
    STATE_EXPIRED: "The connection took too long (more than 10 minutes). Please connect again.",
    ACCESS_DENIED: "The connection was cancelled, so nothing was connected.",
    NOT_ALLOWED: "You no longer have permission to connect ad accounts.",
    CODE_REJECTED: "The ad platform didn't accept the connection. Please try again.",
    PERMISSION_MISSING: "Not all the permissions OrbitOps needs were granted. Connect again and allow them all.",
    NO_REFRESH_TOKEN: "Google didn't allow ongoing access. Remove OrbitOps from your Google account's connected apps, then connect again.",
    PROVIDER_UNAVAILABLE: "The ad platform couldn't be reached. Please try again in a few minutes.",
    PROVIDER_ERROR: "Something went wrong while connecting. Please try again.",
};

export const apiErrorCode = (error: unknown): string | undefined =>
    (error as ApiError | undefined)?.response?.data?.code;

// Field errors the API sends with VALIDATION_FAILED: [{ field: "address.city", message }].
export const apiFieldErrors = (error: unknown): Array<{ field: string; message: string }> => {
    const errors = (error as { response?: { data?: { errors?: Array<{ field: string | null; message: string }> } } })?.response?.data?.errors;
    return Array.isArray(errors) ? errors.filter((entry): entry is { field: string; message: string } => !!entry.field) : [];
};

export const apiErrorMessage = (error: unknown, fallback: string): string => {
    const err = error as ApiError | undefined;
    if (!err?.response) return "Can't reach the server. Check your connection and try again.";
    const code = err.response.data?.code;
    if (code && API_ERROR_MESSAGES[code]) return API_ERROR_MESSAGES[code];
    if (err.response.status === 429) return API_ERROR_MESSAGES.TOO_MANY_ATTEMPTS;
    if (err.response.status && err.response.status >= 500) return "Something went wrong on our side. Please try again.";
    return fallback;
};
