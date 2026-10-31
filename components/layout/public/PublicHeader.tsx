"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { ArrowRight, Menu } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { pageRoutes } from "@/lib/constants";
import { cn } from "@/lib/utils";
import { PublicLogo } from "./PublicLogo";

const navLinks = ["Features", "Solutions", "How it works", "Pricing", "FAQ"];

// Prefixed with the home route so the section links still work from the
// sign-in and demo pages, not only while scrolling the landing page.
const sectionHref = (label: string) => `${pageRoutes.home}#${label.toLowerCase().replaceAll(" ", "-")}`;

export function PublicHeader() {
    const [menu, setMenu] = useState(false);
    const pathname = usePathname();
    const onSignin = pathname === pageRoutes.signin;
    const onSignup = pathname === pageRoutes.signup;

    // Close the sidebar when the screen grows to the desktop header (e.g. a
    // tablet rotating), so its overlay and scroll lock don't stay behind.
    useEffect(() => {
        const desktop = window.matchMedia("(min-width: 1024px)");
        const closeOnDesktop = (e: MediaQueryListEvent) => {
            if (e.matches) setMenu(false);
        };
        desktop.addEventListener("change", closeOnDesktop);
        return () => desktop.removeEventListener("change", closeOnDesktop);
    }, []);

    return (
        <header className="fixed inset-x-0 top-0 z-50 border-b bg-glass backdrop-blur-xl">
            <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-5">
                <PublicLogo />
                <nav className="hidden items-center gap-7 text-sm text-muted-foreground lg:flex">
                    {navLinks.map((x) => (
                        <a key={x} href={sectionHref(x)} className="transition hover:text-foreground">
                            {x}
                        </a>
                    ))}
                </nav>
                <div className="hidden gap-2 lg:flex">
                    <Button asChild variant="ghost" className={cn(onSignin && "bg-accent")}>
                        <Link href={pageRoutes.signin} aria-current={onSignin ? "page" : undefined}>Sign in</Link>
                    </Button>
                    {!onSignup && (
                        <Button asChild variant="hero">
                            <Link href={pageRoutes.signup}>
                                Start free trial <ArrowRight />
                            </Link>
                        </Button>
                    )}
                </div>
                <Sheet open={menu} onOpenChange={setMenu}>
                    <SheetTrigger asChild>
                        <Button variant="ghost" size="icon" className="lg:hidden" aria-label="Open menu">
                            <Menu />
                        </Button>
                    </SheetTrigger>
                    <SheetContent side="left" aria-describedby={undefined} className="flex w-72 flex-col gap-0 p-5 lg:hidden">
                        <SheetTitle asChild>
                            <div onClick={() => setMenu(false)} className="pr-8">
                                <PublicLogo />
                            </div>
                        </SheetTitle>
                        <nav className="mt-6 flex-1 overflow-y-auto">
                            {navLinks.map((x) => (
                                <a onClick={() => setMenu(false)} key={x} href={sectionHref(x)} className="block rounded-md px-2 py-3 text-sm transition hover:bg-accent hover:text-accent-foreground">
                                    {x}
                                </a>
                            ))}
                        </nav>
                        <div className="mt-3 grid gap-2">
                            <Button asChild variant="outline" size="lg" className="w-full">
                                <Link href={pageRoutes.signin} onClick={() => setMenu(false)}>Sign in</Link>
                            </Button>
                            <Button asChild variant="hero" size="lg" className="w-full">
                                <Link href={pageRoutes.signup} onClick={() => setMenu(false)}>Start free trial</Link>
                            </Button>
                        </div>
                    </SheetContent>
                </Sheet>
            </div>
        </header>
    );
}
