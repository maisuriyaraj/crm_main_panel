import { apiRoutes, apiUrl } from "@/lib/constants";

export type PricingPlan = {
    plan_name: string;
    plan_description: string;
    price: string | number;
    price_duration: string;
    recommended?: boolean;
    plan_features: string[];
};

// Plans change rarely, so the landing page is served from cache and refreshed
// in the background at most once a minute instead of hitting the API per visit.
const REVALIDATE_SECONDS = 60;

// Runs on the server. The shared Axios client is browser-oriented (cookies,
// session refresh), so this public, unauthenticated read uses plain fetch.
export async function getPricingPlans(): Promise<PricingPlan[]> {
    const url = apiUrl(apiRoutes.getPricingPlans);
    try {
        const res = await fetch(url, { next: { revalidate: REVALIDATE_SECONDS } });
        if (!res.ok) return [];
        const body = await res.json();
        return Array.isArray(body?.data) ? body.data : [];
    } catch {
        // An unreachable API should leave the pricing section empty, not break the whole landing page.
        return [];
    }
}
