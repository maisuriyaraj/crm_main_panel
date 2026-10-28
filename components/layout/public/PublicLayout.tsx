import type { ReactNode } from "react";
import { PublicFooter } from "./PublicFooter";
import { PublicHeader } from "./PublicHeader";

// The frame for the marketing pages (landing), with the header and footer.
// Auth pages use AuthLayout instead.
export function PublicLayout({ children }: { children: ReactNode }) {
    return (
        <div id="top" className="flex min-h-screen flex-col bg-background text-foreground">
            <PublicHeader />
            <main className="flex-1">{children}</main>
            <PublicFooter />
        </div>
    );
}
