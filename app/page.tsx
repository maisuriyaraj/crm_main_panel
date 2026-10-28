import LandingPage from "@/components/home/LandingPage";
import { getPricingPlans } from "@/lib/pricing/getPricingPlans";

export default async function Home() {
    const pricingPlans = await getPricingPlans();
    return <LandingPage pricingPlans={pricingPlans} />;
}
