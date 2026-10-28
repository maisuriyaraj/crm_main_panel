import Link from "next/link";
import { Rocket } from "lucide-react";
import { pageRoutes } from "@/lib/constants";

export function PublicLogo() {
    return (
        <Link href={pageRoutes.home} className="flex items-center gap-2 font-display text-lg font-bold tracking-tight">
            <span className="grid size-8 place-items-center rounded-lg bg-primary text-primary-foreground shadow-[var(--shadow-primary)]">
                <Rocket className="size-4" aria-hidden />
            </span>
            OrbitOps
        </Link>
    );
}
