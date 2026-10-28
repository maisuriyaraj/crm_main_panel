"use client";

import { notify } from "@/lib/commonFunctions";
import { pageRoutes } from "@/lib/constants";
import { PublicLogo } from "./PublicLogo";

const footerProduct = ["Features", "Pricing", "Integrations", "Documentation"];
const footerCompany = ["About RJ Industries", "Contact", "Careers", "Partners"];
const footerLegal = ["Privacy Policy", "Terms", "Security"];

// Only labels with a real destination get an href; everything else is an
// honest "coming soon" notice instead of a misleading anchor/mailto link.
const footerLinkHref: Record<string, string> = {
    Features: `${pageRoutes.home}#features`,
    Pricing: `${pageRoutes.home}#pricing`,
    Contact: "mailto:hello@orbitops.io",
};

function FooterLink({ label }: { label: string }) {
    const href = footerLinkHref[label];

    if (href) {
        return (
            <a href={href} className="mt-3 block text-sm text-muted-foreground hover:text-foreground">
                {label}
            </a>
        );
    }

    return (
        <a
            href="#"
            onClick={(event) => {
                event.preventDefault();
                notify(`${label} is coming soon.`, { type: "info" });
            }}
            className="mt-3 block text-sm text-muted-foreground hover:text-foreground"
        >
            {label}
        </a>
    );
}

function FooterColumn({ title, links }: { title: string; links: string[] }) {
    return (
        <div>
            <p className="text-xs font-bold uppercase tracking-wider">{title}</p>
            {links.map((x) => (
                <FooterLink label={x} key={x} />
            ))}
        </div>
    );
}

export function PublicFooter() {
    return (
        <footer className="border-t bg-secondary/40 px-5 py-14">
            <div className="mx-auto grid max-w-6xl gap-10 md:grid-cols-[1.5fr_2fr]">
                <div>
                    <PublicLogo />
                    <p className="mt-4 max-w-xs text-sm leading-6 text-muted-foreground">The unified growth platform from RJ Industries, built for ambitious businesses.</p>
                </div>
                <div className="grid grid-cols-2 gap-8 sm:grid-cols-3">
                    <FooterColumn title="Product" links={footerProduct} />
                    <FooterColumn title="Company" links={footerCompany} />
                    <FooterColumn title="Legal" links={footerLegal} />
                </div>
            </div>
            <div className="mx-auto mt-12 flex max-w-6xl flex-col justify-between gap-3 border-t pt-6 text-xs text-muted-foreground sm:flex-row">
                <span>© 2026 RJ Industries. All rights reserved.</span>
                <span className="flex items-center gap-2">
                    <span className="size-2 rounded-full bg-emerald-500" />
                    All systems operational
                </span>
            </div>
        </footer>
    );
}
