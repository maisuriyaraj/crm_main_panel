import type { Metadata } from "next";
import LandingPage from "@/components/home/LandingPage";
import { getPricingPlans } from "@/lib/pricing/getPricingPlans";

export const metadata: Metadata = {
    title: { absolute: "OrbitOps — All-in-One CRM & Business Growth Platform" },
    description:
        "Manage leads, close deals, automate marketing, run Meta ads, send invoices, and track revenue — all from one platform. Start your 14-day free trial, no credit card required.",
    alternates: { canonical: "/" },
};

export default async function Home() {
    const pricingPlans = await getPricingPlans();
    return <LandingPage pricingPlans={pricingPlans} />;
}
