import type { ReactNode } from "react";

// The frame for the auth pages (sign in, book a demo, forgot/reset password):
// the same background as the public pages, without the header and footer.
export function AuthLayout({ children }: { children: ReactNode }) {
    return (
        <div className="flex min-h-screen flex-col bg-background text-foreground">
            <main className="flex flex-1 flex-col">{children}</main>
        </div>
    );
}
