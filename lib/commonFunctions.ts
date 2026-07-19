import { toast } from "sonner";

export const notify = (message: string, options?: { type?: "success" | "error" | "info" }) => {
    const { type = "info" } = options || {};
    toast(message, { type });
}