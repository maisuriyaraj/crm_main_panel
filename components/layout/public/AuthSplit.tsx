import type { ReactNode } from "react";
import { Sparkles } from "lucide-react";
import { PublicLogo } from "./PublicLogo";

type AuthSplitProps = {
    eyebrow: string;
    title: ReactNode;
    description: string;
    // Extra pitch content shown under the description (benefits, stats…).
    aside?: ReactNode;
    cardTitle: string;
    cardDescription: string;
    children: ReactNode;
};

// Shared two-column body for the sign-in and book-a-demo pages: a pitch on
// the left, the form card on the right, same widths and spacing on both.
export function AuthSplit({ eyebrow, title, description, aside, cardTitle, cardDescription, children }: AuthSplitProps) {
    return (
        <section className="relative flex flex-1 flex-col overflow-hidden px-5 py-8 sm:py-10">
            <div className="pointer-events-none absolute inset-0" aria-hidden>
                <div className="absolute inset-x-0 top-0 h-[480px] grid-fade opacity-60" />
                <div className="absolute -top-32 -left-32 h-[520px] w-[520px] rounded-full ambient-glow" />
                <div className="absolute -bottom-40 -right-24 h-[520px] w-[520px] rounded-full ambient-glow opacity-70" />
            </div>

            <div className="relative mx-auto w-full max-w-6xl">
                <PublicLogo />
            </div>

            <div className="relative mx-auto my-auto grid w-full max-w-6xl items-center gap-10 py-10 lg:grid-cols-[minmax(0,1fr)_minmax(0,30rem)] lg:gap-16">
                <div>
                    <span className="inline-flex items-center gap-2 rounded-full border border-border bg-glass px-3 py-1 text-xs font-semibold text-primary backdrop-blur">
                        <Sparkles className="size-3.5" aria-hidden /> {eyebrow}
                    </span>
                    <h1 className="mt-5 text-4xl font-bold leading-tight sm:text-5xl">{title}</h1>
                    <p className="mt-5 max-w-xl text-lg text-muted-foreground">{description}</p>
                    {aside && <div className="mt-8">{aside}</div>}
                </div>

                <div className="w-full rounded-3xl border border-border bg-glass p-6 backdrop-blur-xl panel-shadow sm:p-8">
                    <h2 className="text-2xl font-bold sm:text-3xl">{cardTitle}</h2>
                    <p className="mt-2 text-muted-foreground">{cardDescription}</p>
                    {children}
                </div>
            </div>
        </section>
    );
}
