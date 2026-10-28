import type { ReactNode } from "react";
import { PublicFooter } from "./PublicFooter";
import { PublicHeader } from "./PublicHeader";

// The one frame every public page (landing, sign in, book a demo) sits in,
// so the header, footer and background never drift apart between them.
export function PublicLayout({ children }: { children: ReactNode }) {
    return (
        <div id="top" className="flex min-h-screen flex-col bg-background text-foreground">
            <PublicHeader />
            <main className="flex-1">{children}</main>
            <PublicFooter />
        </div>
    );
}
