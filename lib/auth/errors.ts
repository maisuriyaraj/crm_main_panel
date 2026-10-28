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
