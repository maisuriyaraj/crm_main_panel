import { handleCookieActions } from "@/lib/commonFunctions";

const ACCESS_TOKEN_STORAGE_KEY = "accessToken";

let accessToken: string | null =
    typeof window !== "undefined" ? localStorage.getItem(ACCESS_TOKEN_STORAGE_KEY) : null;

export const getAccessToken = () => accessToken;

export const setAccessToken = (token: string) => {
    accessToken = token;
    if (typeof window !== "undefined") {
        localStorage.setItem(ACCESS_TOKEN_STORAGE_KEY, token);
    }
};

export const clearAccessToken = () => {
    accessToken = null;
    if (typeof window !== "undefined") {
        localStorage.removeItem(ACCESS_TOKEN_STORAGE_KEY);
        // localStorage.removeItem("user");

        // proxy.ts decides "is this user signed in?" from these two cookies
        // alone. Leaving them behind after the session dies makes the server
        // bounce every signin visit back to the dashboard, while the client
        // guard bounces it straight back — an endless reload loop.
        // handleCookieActions("remove", "user");
        handleCookieActions("remove", "token");
    }
};
