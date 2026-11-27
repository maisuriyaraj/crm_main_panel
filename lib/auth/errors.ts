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
    // Roles, permissions and record access
    PERMISSION_NOT_DELEGABLE: "You can't give a role permissions you don't have yourself, or ones only Owner and Admin can hold.",
    PERMISSION_DEPENDENCY: "Some permissions need others to work. Tick the ones they depend on, such as View.",
    ROLE_NOT_ASSIGNABLE: "You can't give this role to anyone: it has more access than you do.",
    ROLE_NAME_TAKEN: "A role with this name already exists. Choose another name.",
    INVALID_ROLE: "That role no longer exists. Reload and choose another.",
    LAST_OWNER: "This member is the only owner. Make someone else an owner first.",
    TEAM_NAME_TAKEN: "A team with this name already exists. Choose another name.",
    TEAM_NOT_EMPTY: "This team still has members, pending invitations or lead assignment rules. Move them to another team first.",
    TEAM_LIMIT_REACHED: "You've reached the limit of 100 teams.",
    LEAD_NOT_IN_TEAM: "The team lead must be an active member of this team.",
    INVALID_TEAM: "That team no longer exists. Reload and choose another.",
    OUT_OF_SCOPE:"You can only work with records you're allowed to see: your own, or your team's. Ask a manager to reassign it.",
    // Pipelines and their stages
    PIPELINE_IN_USE: "This pipeline still has leads on it. Move them to another pipeline first, then remove it.",
    LAST_PIPELINE: "This is your only pipeline, so it can't be removed. Create another one first.",
    PIPELINE_NAME_TAKEN: "A pipeline with this name already exists. Choose another name.",
    STAGE_NOT_IN_PIPELINE: "That stage belongs to a different pipeline. Pick a stage from this one.",
    REASON_REQUIRED: "This stage needs a reason before a lead can move into it.",
    // Lead sources, channels and tenant-defined lead fields
    SOURCE_IN_USE: "Some leads still use this source, so it can't be removed. Switch it off instead — it stays on those leads but is no longer offered on new ones.",
    CHANNEL_IN_USE: "Some leads still use this channel, so it can't be removed. Switch it off instead — it stays on those leads but is no longer offered on new ones.",
    NAME_TAKEN: "Something with this name already exists here. Choose another name.",
    FIELD_KEY_TAKEN: "A lead field with this key already exists. Choose another key.",
    UNKNOWN_CUSTOM_FIELD: "One of these fields no longer exists. Reload the page and try again.",
    // Adding a lead that matches an existing one, and bringing a deleted one back
    DUPLICATE_LEAD: "A lead with this email or mobile already exists.",
    RESTORE_PERIOD_OVER: "This lead was deleted more than 30 days ago, so it can no longer be restored.",
    // Exports
    EXPORT_TOO_LARGE: "This export has more than 10,000 rows. Narrow the filters and try again.",
    // Session and subscription
    SESSION_REVOKED: "Your session has ended. Please sign in again.",
    // Support (impersonation) sessions
    IMPERSONATION_RESTRICTED: "Support sessions can't do this. Ask someone in this workspace to do it themselves.",
    IMPERSONATION_ENDED: "The support session has ended.",
    IMPERSONATION_CODE_INVALID: "This link is no longer valid. Start again from the Master Admin panel.",
    NOT_IMPERSONATING: "This isn't a support session.",
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
    FEATURE_DISABLED: "This module isn't available on your plan.",
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
    // Company settings, the tax identity and the date format
    GSTIN_INVALID: "Enter a valid 15-character GSTIN.",
    // The organization's own invoices from OrbitOps, and asking about a plan
    INVOICE_NOT_FOUND: "That invoice no longer exists. Reload the list and try again.",
    PDF_NOT_READY: "This invoice's PDF isn't ready yet. It is prepared shortly after the invoice is issued.",
    // The organization's own billing settings: the invoices it sends its clients
    STATE_REQUIRED: "Choose the GST state of your billing address. It decides which GST applies on an invoice.",
    TAX_RATE_NOT_FOUND: "That tax rate no longer exists. Reload the list and try again.",
    TAX_RATE_NAME_TAKEN: "A tax rate with this name already exists. Choose another name.",
    TAX_RATE_LIMIT_REACHED: "You have reached the limit of 50 tax rates. Remove one you no longer use.",
    TAX_RATE_IS_DEFAULT: "This is your default tax rate. Make another one the default first.",
    TAX_RATE_INACTIVE: "Turn this rate back on before making it the default.",
    TEMPLATE_NOT_CUSTOMISED: "This email already uses the standard wording, so there is nothing to reset.",
    GATEWAY_NOT_FOUND: "This payment gateway is not set up yet.",
    GATEWAY_SECRET_REQUIRED: "Add the secret key before turning this gateway on.",
    INVOICE_NUMBER_TOO_LONG: "That prefix makes the invoice number too long. Use 1 to 3 letters or digits.",
    // Accounting sync: the tenant's own Zoho Books, QuickBooks or Tally
    ACCOUNTING_PROVIDER_NOT_FOUND: "That accounting software isn't supported. Reload the page and choose another.",
    ACCOUNTING_NOT_CONNECTED: "This accounting software isn't connected. Connect it first.",
    ACCOUNTING_CREDENTIALS_INCOMPLETE: "Fill in every field before connecting.",
    ACCOUNTING_ORG_ID_REQUIRED: "Enter the account id from your accounting software.",
    ACCOUNTING_SETTINGS_INCOMPLETE: "Some settings are still needed before this can be used.",
    ACCOUNTING_TOKEN_INVALID: "Your accounting software no longer accepts this connection. Create a new refresh token and connect again.",
    ACCOUNTING_ORG_NOT_FOUND: "That account id is not in the accounting account these credentials belong to. Check the id.",
    ACCOUNTING_RATE_LIMITED: "Your accounting software is busy and asked us to slow down. It will be retried by itself.",
    ACCOUNTING_NOT_FOUND: "Your accounting software could not find that record. It may have been deleted there.",
    ACCOUNTING_DUPLICATE: "Your accounting software already has a document with this number. Change the number, or remove the one there.",
    ACCOUNTING_ITEM_NOT_SET: "Choose which QuickBooks item invoice lines should post to.",
    ACCOUNTING_CLIENT_NOT_SYNCED: "This invoice's client has to reach your accounting software first. It is queued.",
    ACCOUNTING_INVOICE_NOT_SYNCED: "This payment's invoice has to reach your accounting software first. It is queued.",
    ACCOUNTING_RECORD_GONE: "That record no longer exists in OrbitOps, so it was skipped.",
    ACCOUNTING_NO_DOCUMENT_SOURCE: "There is nothing to sync yet: OrbitOps cannot create a client invoice. Your connection is saved for when it can.",
    ACCOUNTING_EXPORT_ONLY: "Tally cannot be pushed to. Download the voucher file and import it in Tally.",
    ACCOUNTING_NO_INVOICES_CHOSEN: "Choose the invoices to export first.",
    ACCOUNTING_NO_INVOICES_FOUND: "None of those invoices could be read. Reload the list and try again.",
    ACCOUNTING_EXPORT_TOO_LARGE: "Export at most 500 invoices at a time. Narrow the period and try again.",
    ACCOUNTING_REJECTED: "Your accounting software refused the document. Its own message is in the sync history.",
    ACCOUNTING_FAILED: "The sync did not go through. The reason is in the sync history.",
    // Notification preferences
    UNKNOWN_ALERT_TYPE: "That notification isn't one you can change. Reload the page and try again.",
    ALERT_TYPE_LOCKED: "This notification is always sent and can't be turned off.",
    // Refreshing the figures. The platforms are re-read every hour anyway, so a
    // refused refresh is never something the member has to fix.
    SYNC_TOO_SOON: "This platform was refreshed a moment ago. Try again in a few minutes.",
    SYNC_IN_PROGRESS: "A refresh is already running. The figures will update in a moment.",
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
