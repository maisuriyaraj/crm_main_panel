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
    }
};
