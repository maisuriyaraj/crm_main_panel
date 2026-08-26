import { toast } from "sonner";

export const notify = (message: string, options?: { type?: "success" | "error" | "info" }) => {
    const { type = "info" } = options || {};
    toast(message, { type });
}

export const handleLocalStorageActions = (action: "set" | "get" | "remove", key: string, value?: any) => {
    switch (action) {
        case "set":
            localStorage.setItem(key, JSON.stringify(value));
            break;
        case "get":
            const item = localStorage.getItem(key);
            return item ? JSON.parse(item) : null;
        case "remove":
            localStorage.removeItem(key);
            break;
        default:
            break;
    }
}

export const handleCookieActions = (action: "set" | "get" | "remove", key: string, value?: string, options?: { expires?: number; path?: string }) => {
    const stringifyValue = value ? encodeURIComponent(JSON.stringify(value)) : "";
    switch (action) {
        case "set":
            const expires = options?.expires ? `; expires=${new Date(Date.now() + options.expires * 1000).toUTCString()}` : "";
            const path = options?.path ? `; path=${options.path}` : "; path=/";
            document.cookie = `${key}=${stringifyValue}${expires}${path}`;
            break;
        case "get":
            const cookies = document.cookie.split("; ");
            for (const cookie of cookies) {
                const [name, value] = cookie.split("=");
                if (name.trim() === key) {
                    return decodeURIComponent(value);
                }
            }
            return null;
        case "remove":
            document.cookie = `${key}=; expires=Thu, 01 Jan 1970 00:00:00 GMT`;
            break;
        default:
            break;
    }
}
