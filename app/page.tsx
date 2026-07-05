"use client";

import { motion } from "framer-motion";
import { Activity, ArrowRight, BarChart3, Building2, Check, ChevronDown, CircleDollarSign, Clock3, Cloud, GraduationCap, HeartPulse, LineChart, Mail, Megaphone, Menu, MousePointer2, Play, Quote, Rocket, ShieldCheck, Sparkles, Store, Target, TrendingUp, Users, Workflow, X, Zap } from "lucide-react";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";
import { pageRoutes } from "@/lib/constants";
import { useAppDispatch, useAppSelector } from "@/lib/store/hooks";
import { reqToGetPricingPlans } from "@/lib/store/slices/pricingPlansSlice";

const fade = { initial: { opacity: 0, y: 24 }, whileInView: { opacity: 1, y: 0 }, viewport: { once: true, margin: "-80px" }, transition: { duration: 0.6 } };
const features = [
  { icon: Users, title: "CRM Management", tone: "text-primary bg-primary/10", items: ["Lead Management", "Contact Management", "Activity Tracking", "Notes & Attachments"] },
  { icon: TrendingUp, title: "Sales Pipeline", tone: "text-green-600 bg-green-500/10", items: ["Kanban Pipelines", "Deal Tracking", "Forecasting", "Follow-Up Management"] },
  { icon: Workflow, title: "Marketing Automation", tone: "text-emerald-600 bg-emerald-500/10", items: ["Workflows", "Email Sequences", "Lead Nurturing", "Trigger Based Actions"] },
  { icon: Megaphone, title: "Advertising Platform", tone: "text-lime-600 bg-lime-500/10", items: ["Meta Ads Management", "Campaign Analytics", "Lead Sync", "ROI Tracking"] },
  { icon: CircleDollarSign, title: "Billing & Invoicing", tone: "text-teal-600 bg-teal-500/10", items: ["Subscription Tracking", "Invoice Generation", "Payment Monitoring", "Revenue Reporting"] },
  { icon: BarChart3, title: "Business Analytics", tone: "text-green-700 bg-green-500/10", items: ["Executive Dashboard", "Revenue Insights", "Team Performance", "Conversion Analytics"] },
];
const plans = [
  { name: "Starter", price: "$29", desc: "For small teams getting organized", features: ["Up to 3 users", "Core CRM", "1 sales pipeline", "Email tracking"] },
  { name: "Growth", price: "$79", desc: "For teams ready to accelerate", popular: true, features: ["Up to 10 users", "Marketing automation", "5 sales pipelines", "Advanced reporting"] },
  { name: "Business", price: "$149", desc: "For scaling organizations", features: ["Up to 30 users", "Ads management", "Billing & invoicing", "Custom dashboards"] },
  { name: "Enterprise", price: "Custom", desc: "For complex, high-volume teams", features: ["Unlimited users", "Dedicated success manager", "SLA & SSO", "Custom integrations"] },
];

const sidebarItems = [
  { Icon: BarChart3, label: "Overview" },
  { Icon: Users, label: "Contacts" },
  { Icon: Target, label: "Pipeline" },
  { Icon: Mail, label: "Campaigns" },
  { Icon: Workflow, label: "Automation" },
  { Icon: Megaphone, label: "Advertising" },
];

const statCards = [
  { label: "Total revenue", value: "$184,240", change: "+18.2%" },
  { label: "New leads", value: "1,429", change: "+8.4%" },
  { label: "Deals won", value: "184", change: "+12.1%" },
  { label: "Ad ROAS", value: "4.8x", change: "+0.6x" },
];

const revenueBarHeights = [35, 48, 41, 62, 54, 74, 68, 86, 71, 92, 82, 100];

const pipelineStages = [
  { label: "Qualified", value: "$84k", pct: 78 },
  { label: "Proposal", value: "$62k", pct: 59 },
  { label: "Negotiation", value: "$41k", pct: 42 },
  { label: "Closed", value: "$32k", pct: 31 },
];

const activityTimeline = [
  { Icon: Mail, action: "Email opened", time: "2 min ago" },
  { Icon: MousePointer2, action: "Pricing visited", time: "14 min ago" },
  { Icon: CircleDollarSign, action: "Invoice paid", time: "Yesterday" },
  { Icon: Megaphone, action: "Ad converted", time: "3 days ago" },
];

const solutionProblems = [
  { Icon: Target, label: "Lost leads" },
  { Icon: Clock3, label: "Missed follow-ups" },
  { Icon: Users, label: "Scattered customer data" },
  { Icon: Cloud, label: "Disconnected tools" },
  { Icon: MousePointer2, label: "Poor marketing attribution" },
  { Icon: LineChart, label: "Manual reporting" },
];

const platformChecks = ["One customer timeline", "No-code automation", "Live revenue intelligence", "Cross-channel attribution"];

const customer360Stats = ["$18.4K LTV", "12 activities", "4 open deals"];

const screenTabs = ["CRM Dashboard", "Sales Pipeline", "Lead Management", "Analytics", "Ads Dashboard", "Billing"];
const screenLabels = ["CRM Dashboard", "Sales Pipeline", "Lead Management", "Analytics Dashboard", "Ads Dashboard", "Billing Overview"];
const screenSkeletonWidths = [70, 92, 60, 82, 48];
const screenBarHeights = [25, 48, 35, 62, 51, 76, 65, 88, 70, 95];

const howItWorksSteps = [
  { title: "Capture Leads", desc: "From every channel" },
  { title: "Manage Customers", desc: "In one clean record" },
  { title: "Automate Follow-Ups", desc: "At exactly the right time" },
  { title: "Track Revenue", desc: "With live intelligence" },
  { title: "Scale Marketing", desc: "Using proven attribution" },
  { title: "Grow Business", desc: "With clarity and control" },
];

const industries = [
  { Icon: Building2, label: "Real Estate" },
  { Icon: HeartPulse, label: "Healthcare" },
  { Icon: GraduationCap, label: "Education" },
  { Icon: Megaphone, label: "Agencies" },
  { Icon: CircleDollarSign, label: "Finance" },
  { Icon: Cloud, label: "SaaS Companies" },
  { Icon: Store, label: "Retail Businesses" },
  { Icon: ShieldCheck, label: "Professional Services" },
];

const stats = [
  { value: "100K+", label: "Leads Managed" },
  { value: "10M+", label: "Customer Activities" },
  { value: "99.9%", label: "Platform Uptime" },
  { value: "40%", label: "Avg. Productivity Increase" },
];

const testimonials = [
  { quote: "OrbitOps gave us a single view of every deal. Our reps spend less time updating systems and more time closing.", name: "Maya Chen", role: "VP of Sales, Northstar" },
  { quote: "We finally know which campaigns create revenue—not just clicks. Client reporting now takes minutes, not days.", name: "Daniel Brooks", role: "Founder, Brightline Agency" },
  { quote: "Our follow-up consistency transformed overnight. Nothing gets lost, and every customer feels remembered.", name: "Elena Rossi", role: "COO, Grove & Co." },
];

const comparisonTable = [
  ["CRM contacts", "2,500", "25,000", "100,000", "Unlimited"],
  ["Automations", "5", "50", "Unlimited", "Unlimited"],
  ["Custom reporting", "—", "Basic", "Advanced", "Advanced"],
  ["Priority support", "—", "—", "Included", "Dedicated"],
];

const faqs = [
  { q: "Can I migrate data from my current CRM?", a: "Yes. Our guided import supports CSV files and popular CRM platforms. Growth plans and above include assisted migration." },
  { q: "Does OrbitOps integrate with my existing tools?", a: "OrbitOps connects with popular email, calendar, payment, advertising, and productivity tools through native integrations and our API." },
  { q: "Is my customer data secure?", a: "Yes. We use encryption in transit and at rest, strict access controls, continuous monitoring, and reliable backups." },
  { q: "Do I need technical skills to set up automations?", a: "No. The visual workflow builder makes it easy for anyone to create powerful automations using triggers and actions." },
  { q: "Can I change plans later?", a: "Absolutely. Upgrade or downgrade as your team and needs evolve. Your data and configuration stay intact." },
  { q: "What support is included?", a: "Every plan includes access to our help center and customer support. Business and Enterprise plans receive priority assistance." },
];

const navLinks = ["Features", "Solutions", "How it works", "Pricing", "FAQ"];

const footerProduct = ["Features", "Pricing", "Integrations", "Documentation"];
const footerCompany = ["About RJ Industries", "Contact", "Careers", "Partners"];
const footerLegal = ["Privacy Policy", "Terms", "Security"];

const trustedBrands = ["NORTHSTAR", "VERTEX", "APERTURE", "MONOLITH", "SUMMIT"];

function Logo() { return <a href="#top" className="flex items-center gap-2 font-display text-lg font-bold tracking-tight"><span className="grid size-8 place-items-center rounded-lg bg-primary text-primary-foreground shadow-[var(--shadow-primary)]"><Rocket className="size-4" /></span>OrbitOps</a>; }
function SectionHeading({ eyebrow, title, copy }: { eyebrow: string; title: string; copy: string }) { return <motion.div {...fade} className="mx-auto mb-12 max-w-2xl text-center"><p className="mb-3 text-xs font-bold uppercase tracking-[.18em] text-primary">{eyebrow}</p><h2 className="text-balance text-3xl font-semibold tracking-tight sm:text-4xl">{title}</h2><p className="mt-4 text-pretty text-muted-foreground">{copy}</p></motion.div>; }

function Dashboard() {
  return <div className="relative mx-auto mt-16 max-w-6xl">
    <div className="panel-shadow overflow-hidden rounded-2xl border border-border-strong bg-surface backdrop-blur-xl">
      <div className="flex h-12 items-center gap-2 border-b px-4">
        <span className="size-2.5 rounded-full bg-destructive" />
        <span className="size-2.5 rounded-full bg-lime-400" />
        <span className="size-2.5 rounded-full bg-emerald-500" />
        <span className="mx-auto hidden rounded-md bg-muted px-24 py-1 text-[9px] text-muted-foreground sm:block">app.orbitops.io/dashboard</span>
      </div>
      <div className="grid min-h-[430px] grid-cols-[64px_1fr] sm:grid-cols-[180px_1fr]">
        <aside className="border-r bg-secondary/40 p-3">
          <div className="mb-7 hidden items-center gap-2 px-2 text-xs font-semibold sm:flex"><span className="size-6 rounded-md bg-primary" />OrbitOps</div>
          {sidebarItems.map(({ Icon, label }, i) => (
            <div key={label} className={`mb-2 flex items-center gap-3 rounded-lg p-2 text-xs ${i === 0 ? "bg-primary/10 text-primary" : "text-muted-foreground"}`}>
              <Icon className="size-4" /><span className="hidden sm:block">{label}</span>
            </div>
          ))}
        </aside>
        <main className="min-w-0 p-3 sm:p-6">
          <div className="mb-6 flex items-start justify-between">
            <div><p className="text-[10px] text-muted-foreground">Tuesday, 14 June</p><h3 className="text-base font-semibold sm:text-xl">Good morning, Alex</h3></div>
            <span className="rounded-lg bg-primary px-3 py-2 text-[9px] font-semibold text-primary-foreground">+ Add lead</span>
          </div>
          <div className="grid grid-cols-2 gap-2 lg:grid-cols-4">
            {statCards.map(({ label, value, change }) => (
              <div key={label} className="rounded-xl border bg-card/70 p-3">
                <div className="flex justify-between"><span className="text-[9px] text-muted-foreground">{label}</span><Activity className="size-3 text-primary" /></div>
                <strong className="mt-2 block text-sm sm:text-lg">{value}</strong>
                <small className="text-[9px] text-emerald-600">{change}</small>
              </div>
            ))}
          </div>
          <div className="mt-3 grid gap-3 lg:grid-cols-[1.5fr_1fr]">
            <div className="rounded-xl border bg-card/70 p-4">
              <div className="mb-4 flex justify-between text-[10px]"><b>Revenue overview</b><span className="text-muted-foreground">Last 6 months</span></div>
              <div className="flex h-36 items-end gap-2">
                {revenueBarHeights.map((h, i) => (
                  <motion.span key={`rev-bar-${i}`} initial={{ height: 0 }} animate={{ height: `${h}%` }} transition={{ delay: .5 + i * .04 }} className="flex-1 rounded-t-sm bg-primary/80" style={{ display: 'block' }} />
                ))}
              </div>
            </div>
            <div className="hidden rounded-xl border bg-card/70 p-4 lg:block">
              <b className="text-[10px]">Sales pipeline</b>
              <div className="mt-4 space-y-4">
                {pipelineStages.map(({ label, value, pct }) => (
                  <div key={label}>
                    <div className="mb-1 flex justify-between text-[9px]"><span>{label}</span><b>{value}</b></div>
                    <div className="h-1.5 rounded-full bg-muted"><div className="h-full rounded-full bg-green-500" style={{ width: `${pct}%` }} /></div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
    <div className="absolute -inset-20 -z-10 ambient-glow blur-3xl" />
  </div>;
}

export default function Home() {
  
  const dispatch = useAppDispatch();
  const { pricingPlans } = useAppSelector((state) => state.pricing);

  const fetchPricingPlans = () => {
    // Dispatch the action to fetch pricing plans
    dispatch(reqToGetPricingPlans({
      data: {},
      onSuccess: (data: any) => { },
      onFailure: (error: any) => { },
    }));
  }

  useEffect(() => {
    fetchPricingPlans();
  }, []);
  const [menu, setMenu] = useState(false); const [faq, setFaq] = useState(0); const [screen, setScreen] = useState(0);
  const router = useRouter();

  const goToBookTrial = () => {
    router.push(pageRoutes.signup)
  }

  return <div id="top" className="min-h-screen bg-background text-foreground">
    <header className="fixed inset-x-0 top-0 z-50 border-b bg-glass backdrop-blur-xl">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-5">
        <Logo />
        <nav className="hidden items-center gap-7 text-sm text-muted-foreground lg:flex">
          {navLinks.map(x => <a key={x} href={`#${x.toLowerCase().replaceAll(" ", "-")}`} className="transition hover:text-foreground">{x}</a>)}
        </nav>
        <div className="hidden gap-2 lg:flex"><Button variant="ghost" onClick={() => router.push(pageRoutes.signin)}>Sign in</Button><Button variant="hero" onClick={goToBookTrial}>Start free trial <ArrowRight /></Button></div>
        <Button variant="ghost" size="icon" className="lg:hidden" onClick={() => setMenu(!menu)} aria-label="Toggle menu">{menu ? <X /> : <Menu />}</Button>
      </div>
      {menu && <nav className="border-t bg-background p-5 lg:hidden">
        {navLinks.map(x => <a onClick={() => setMenu(false)} key={x} href={`#${x.toLowerCase().replaceAll(" ", "-")}`} className="block py-3 text-sm">{x}</a>)}
        <Button variant="hero" size="lg" className="mt-3 w-full" onClick={goToBookTrial}>
          Start free trial
        </Button>
      </nav>}
    </header>

    <main>
      <section className="relative overflow-hidden px-5 pb-24 pt-32 sm:pt-40">
        <div className="absolute inset-0 -z-20 grid-fade" />
        <div className="absolute left-1/2 top-24 -z-10 h-96 w-[50rem] -translate-x-1/2 ambient-glow blur-3xl" />
        <div className="mx-auto max-w-4xl text-center">
          <div className="mb-6 inline-flex items-center gap-2 rounded-full border bg-surface px-3 py-1.5 text-xs font-semibold text-primary shadow-sm"><Sparkles className="size-3.5" /> The operating system for business growth <ArrowRight className="size-3" /></div>
          <h1 className="text-gradient text-balance text-5xl font-semibold leading-[1.08] tracking-[-.045em] sm:text-7xl">Run Your Entire Business From One Platform</h1>
          <p className="mx-auto mt-6 max-w-2xl text-pretty text-base leading-7 text-muted-foreground sm:text-lg">OrbitOps combines CRM, Sales, Marketing, Billing, Automation, Analytics, and Advertising into a unified growth engine.</p>
          <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row"><Button variant="hero" size="lg" onClick={goToBookTrial}>Start Free Trial <ArrowRight /></Button><Button variant="glass" size="lg" onClick={goToBookTrial}><Play /> Book a Demo</Button></div>
          <p className="mt-4 text-xs text-muted-foreground">14-day free trial · No credit card required · Setup in minutes</p>
        </div>
        <Dashboard />
      </section>

      <section className="border-y bg-surface py-9">
        <p className="text-center text-xs font-semibold uppercase tracking-[.15em] text-muted-foreground">Trusted by growing businesses worldwide</p>
        <div className="mx-auto mt-7 flex max-w-5xl flex-wrap items-center justify-center gap-x-12 gap-y-5 px-5 text-lg font-bold text-muted-foreground/60">
          {trustedBrands.map(x => <span key={x}>{x}</span>)}
        </div>
      </section>

      <section id="solutions" className="px-5 py-24">
        <SectionHeading eyebrow="From chaos to clarity" title="Your tools should work together" copy="Stop losing momentum to scattered systems, manual work, and invisible customer journeys." />
        <div className="mx-auto grid max-w-6xl gap-px overflow-hidden rounded-2xl border bg-border md:grid-cols-3">
          {solutionProblems.map(({ Icon, label }, i) => (
            <motion.div {...fade} transition={{ delay: i * .05 }} key={label} className="bg-background p-7">
              <Icon className="mb-5 size-5 text-destructive" />
              <h3 className="text-base font-semibold">{label}</h3>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">One source of truth keeps every opportunity, action, and outcome in view.</p>
            </motion.div>
          ))}
        </div>
      </section>

      <section className="overflow-hidden bg-secondary/50 px-5 py-24">
        <div className="mx-auto grid max-w-6xl items-center gap-14 lg:grid-cols-2">
          <motion.div {...fade}>
            <p className="text-xs font-bold uppercase tracking-[.18em] text-primary">One intelligent platform</p>
            <h2 className="mt-3 text-4xl font-semibold tracking-tight">Meet the growth engine that connects every team.</h2>
            <p className="mt-5 leading-7 text-muted-foreground">OrbitOps unifies your customer data, workflows, conversations, revenue, and campaigns—so teams move faster with complete context.</p>
            <div className="mt-8 grid gap-4 sm:grid-cols-2">
              {platformChecks.map(x => (
                <div key={x} className="flex items-center gap-3 text-sm font-semibold">
                  <span className="grid size-6 place-items-center rounded-full bg-emerald-500/10 text-emerald-600"><Check className="size-3.5" /></span>{x}
                </div>
              ))}
            </div>
            <Button variant="hero" size="lg" className="mt-9" onClick={goToBookTrial}>
              Explore the platform <ArrowRight />
            </Button>
          </motion.div>
          <motion.div {...fade} className="relative rounded-2xl border bg-card p-5 panel-shadow">
            <div className="mb-5 flex items-center justify-between">
              <div><small className="text-muted-foreground">Customer 360°</small><h3 className="font-semibold">Olivia Martin</h3></div>
              <span className="rounded-full bg-emerald-500/10 px-3 py-1 text-xs font-semibold text-emerald-600">High intent</span>
            </div>
            <div className="grid grid-cols-3 gap-2">
              {customer360Stats.map(x => <div className="rounded-xl bg-secondary p-3 text-center text-xs font-semibold" key={x}>{x}</div>)}
            </div>
            <div className="mt-5 border-l-2 border-primary/30 pl-5">
              {activityTimeline.map(({ Icon, action, time }) => (
                <div className="relative mb-5 flex items-center gap-3" key={action}>
                  <span className="absolute -left-[29px] size-4 rounded-full border-4 border-card bg-primary" />
                  <Icon className="size-4 text-primary" />
                  <div><p className="text-xs font-semibold">{action}</p><small className="text-muted-foreground">{time}</small></div>
                </div>
              ))}
            </div>
          </motion.div>
        </div>
      </section>

      <section id="features" className="px-5 py-24">
        <SectionHeading eyebrow="Everything you need" title="One platform. Every growth lever." copy="Replace your fragmented stack with powerful, connected tools your whole team will actually use." />
        <div className="mx-auto grid max-w-6xl gap-5 md:grid-cols-2 lg:grid-cols-3">
          {features.map((f, i) => (
            <motion.article {...fade} transition={{ delay: i * .06 }} key={f.title} className="group rounded-2xl border bg-card p-7 transition hover:-translate-y-1 hover:border-primary/30 hover:shadow-xl">
              <span className={`grid size-11 place-items-center rounded-xl ${f.tone}`}><f.icon className="size-5" /></span>
              <h3 className="mt-5 text-lg font-semibold">{f.title}</h3>
              <ul className="mt-5 space-y-3">
                {f.items.map(x => <li className="flex gap-2 text-sm text-muted-foreground" key={x}><Check className="size-4 text-emerald-600" />{x}</li>)}
              </ul>
            </motion.article>
          ))}
        </div>
      </section>

      <section className="bg-secondary/50 px-5 py-24">
        <SectionHeading eyebrow="See OrbitOps in action" title="A command center for your business" copy="Purpose-built workspaces give every team focus—without sacrificing the complete picture." />
        <div className="mx-auto max-w-6xl">
          <div className="mb-6 flex gap-2 overflow-x-auto pb-2">
            {screenTabs.map((x, i) => <Button key={x} onClick={() => setScreen(i)} variant={screen === i ? "default" : "ghost"} className="shrink-0 rounded-full">{x}</Button>)}
          </div>
          <motion.div key={screen} initial={{ opacity: 0, scale: .98 }} animate={{ opacity: 1, scale: 1 }} className="overflow-hidden rounded-2xl border bg-card panel-shadow">
            <div className="flex h-12 items-center gap-2 border-b px-5">
              <span className="size-2.5 rounded-full bg-destructive" />
              <span className="size-2.5 rounded-full bg-lime-400" />
              <span className="size-2.5 rounded-full bg-emerald-500" />
              <span className="ml-4 text-xs text-muted-foreground">{screenLabels[screen]}</span>
            </div>
            <div className="grid min-h-[420px] gap-4 p-5 md:grid-cols-[1fr_2fr]">
              <div className="rounded-xl bg-secondary p-5">
                <div className="h-3 w-24 rounded bg-foreground/15" />
                <div className="mt-7 space-y-3">
                  {screenSkeletonWidths.map((w, i) => (
                    <div key={`skeleton-${i}-${w}`} className="rounded-xl border bg-card p-3">
                      <div className="h-2 rounded bg-primary/20" style={{ width: `${w}%` }} />
                      <div className="mt-2 h-2 w-1/2 rounded bg-muted" />
                    </div>
                  ))}
                </div>
              </div>
              <div className="rounded-xl border p-5">
                <div className="mb-8 flex justify-between">
                  <div><small className="text-muted-foreground">Performance</small><p className="text-2xl font-bold">$284,840</p></div>
                  <span className="h-fit rounded-full bg-emerald-500/10 px-3 py-1 text-xs text-emerald-600">+24.8%</span>
                </div>
                <div className="flex h-60 items-end gap-3">
                  {screenBarHeights.map((h, i) => (
                    <div key={`screen-bar-${i}-${h}`} className="flex-1 rounded-t-md bg-primary" style={{ height: `${h}%`, opacity: .35 + i * .06 }} />
                  ))}
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      <section id="how-it-works" className="px-5 py-24">
        <SectionHeading eyebrow="How it works" title="A clear path from lead to growth" copy="Six connected steps turn interest into lasting customer value." />
        <div className="relative mx-auto grid max-w-6xl gap-6 md:grid-cols-3 lg:grid-cols-6">
          <div className="absolute left-[8%] right-[8%] top-6 hidden border-t border-dashed border-primary/40 lg:block" />
          {howItWorksSteps.map(({ title, desc }, i) => (
            <motion.div {...fade} transition={{ delay: i * .08 }} key={title} className="relative text-center">
              <span className="relative z-10 mx-auto grid size-12 place-items-center rounded-full border-4 border-background bg-primary font-display text-sm font-bold text-primary-foreground">{i + 1}</span>
              <h3 className="mt-5 text-sm font-semibold">{title}</h3>
              <p className="mt-2 text-xs leading-5 text-muted-foreground">{desc}</p>
            </motion.div>
          ))}
        </div>
      </section>

      <section className="border-y bg-surface px-5 py-24">
        <SectionHeading eyebrow="Built for your world" title="Flexible enough for every industry" copy="Adapt OrbitOps to your customer journey, processes, and growth model." />
        <div className="mx-auto grid max-w-6xl grid-cols-2 gap-3 md:grid-cols-4">
          {industries.map(({ Icon, label }) => (
            <div key={label} className="flex items-center gap-3 rounded-xl border bg-background p-4 text-sm font-semibold">
              <Icon className="size-5 text-primary" />{label}
            </div>
          ))}
        </div>
      </section>

      <section className="bg-foreground px-5 py-20 text-background">
        <div className="mx-auto grid max-w-6xl grid-cols-2 gap-10 lg:grid-cols-4">
          {stats.map(({ value, label }, i) => (
            <motion.div {...fade} transition={{ delay: i * .08 }} className="text-center" key={value}>
              <strong className="font-display text-4xl sm:text-5xl">{value}</strong>
              <p className="mt-2 text-xs opacity-60 sm:text-sm">{label}</p>
            </motion.div>
          ))}
        </div>
      </section>

      <section className="px-5 py-24">
        <SectionHeading eyebrow="Customer stories" title="Teams move faster with OrbitOps" copy="Real outcomes from leaders who replaced complexity with one connected platform." />
        <div className="mx-auto grid max-w-6xl gap-5 md:grid-cols-3">
          {testimonials.map(({ quote, name, role }, i) => (
            <motion.blockquote {...fade} transition={{ delay: i * .08 }} key={name} className="rounded-2xl border bg-card p-7">
              <Quote className="size-7 text-primary/30" />
              <p className="mt-5 text-sm leading-7">&ldquo;{quote}&rdquo;</p>
              <footer className="mt-7 flex items-center gap-3">
                <span className="grid size-10 place-items-center rounded-full bg-primary/10 text-sm font-bold text-primary">{name.split(" ").map(y => y[0]).join("")}</span>
                <div><cite className="not-italic text-sm font-semibold">{name}</cite><p className="text-xs text-muted-foreground">{role}</p></div>
              </footer>
            </motion.blockquote>
          ))}
        </div>
      </section>

      <section id="pricing" className="bg-secondary/50 px-5 py-24">
        <SectionHeading eyebrow="Simple pricing" title="A plan for every stage of growth" copy="Start free, then scale on your terms. All plans include secure cloud hosting and support." />
        <div className="mx-auto grid max-w-7xl gap-4 md:grid-cols-2 xl:grid-cols-4">
          {pricingPlans.map((p, i) => (
            <motion.article {...fade} transition={{ delay: i * .06 }} key={p.plan_name} className={`relative rounded-2xl border p-6 ${p.recommended ? "border-primary bg-card shadow-[var(--shadow-primary)]" : "bg-card"}`}>
              {p.recommended && <span className="absolute -top-3 left-6 rounded-full bg-primary px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-primary-foreground">Most popular</span>}
              <h3 className="text-lg font-semibold">{p.plan_name}</h3>
              <p className="mt-2 min-h-10 text-xs text-muted-foreground">{p.plan_description}</p>
              <div className="my-6"><strong className="text-3xl">{p.price_duration !== "custom" ? p.price : "Custom"}</strong>{p.price_duration !== "custom" && <span className="text-xs text-muted-foreground"> / month</span>}</div>
              <Button variant={p.recommended ? "hero" : "outline"} className="w-full" onClick={goToBookTrial}>
                {p.price_duration === "custom" ? "Contact sales" : "Start free trial"}
              </Button>
              <ul className="mt-6 space-y-3">
                {p.plan_features.map(x => <li key={x} className="flex gap-2 text-xs"><Check className="size-4 text-emerald-600" />{x}</li>)}
              </ul>
            </motion.article>
          ))}
        </div>
        {/* <div className="mx-auto mt-10 max-w-5xl overflow-x-auto rounded-2xl border bg-card">
          <table className="w-full min-w-[680px] text-left text-sm">
            <thead>
              <tr className="border-b bg-secondary/50">
                <th className="p-4">Compare features</th>
                {plans.map(p => <th className="p-4" key={p.plan_name}>{p.plan_name}</th>)}
              </tr>
            </thead>
            <tbody>
              {comparisonTable.map(r => (
                <tr key={r[0]} className="border-b last:border-0">
                  {r.map((c, i) => <td key={`${r[0]}-col-${i}`} className={`p-4 ${i === 0 ? "font-semibold" : "text-muted-foreground"}`}>{c}</td>)}
                </tr>
              ))}
            </tbody>
          </table>
        </div> */}
      </section>

      <section id="faq" className="px-5 py-24">
        <SectionHeading eyebrow="FAQ" title="Questions, answered" copy="Everything you need to know before bringing your business into OrbitOps." />
        <div className="mx-auto max-w-3xl divide-y border-y">
          {faqs.map(({ q, a }, i) => (
            <div key={q}>
              <button onClick={() => setFaq(faq === i ? -1 : i)} className="flex w-full items-center justify-between py-5 text-left text-sm font-semibold" aria-expanded={faq === i}>
                {q}<ChevronDown className={`size-4 transition ${faq === i ? "rotate-180" : ""}`} />
              </button>
              {faq === i && <motion.p initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} className="pb-5 text-sm leading-6 text-muted-foreground">{a}</motion.p>}
            </div>
          ))}
        </div>
      </section>

      <section className="px-5 pb-24">
        <motion.div {...fade} className="relative mx-auto max-w-6xl overflow-hidden rounded-3xl bg-primary px-6 py-16 text-center text-primary-foreground shadow-[var(--shadow-primary)] sm:px-12">
          <div className="absolute inset-0 grid-fade opacity-20" />
          <Zap className="relative mx-auto mb-5 size-8" />
          <h2 className="relative text-balance text-3xl font-semibold sm:text-5xl">Ready to Scale Your Business with OrbitOps?</h2>
          <p className="relative mx-auto mt-4 max-w-xl text-sm opacity-80 sm:text-base">Bring your teams, tools, and customer journey together. See the difference in your first week.</p>
          <div className="relative mt-8 flex flex-col justify-center gap-3 sm:flex-row">
            <Button variant="inverse" size="lg" onClick={goToBookTrial} >Start Free Trial <ArrowRight /></Button>
            <Button variant="glass" size="lg" className="border-primary-foreground/30 bg-primary-foreground/10 text-primary-foreground hover:bg-primary-foreground/20" onClick={goToBookTrial}>
              <Play /> Schedule Demo
            </Button>
          </div>
        </motion.div>
      </section>
    </main>

    <footer className="border-t bg-secondary/40 px-5 py-14">
      <div className="mx-auto grid max-w-6xl gap-10 md:grid-cols-[1.5fr_2fr]">
        <div><Logo /><p className="mt-4 max-w-xs text-sm leading-6 text-muted-foreground">The unified growth platform from RJ Industries, built for ambitious businesses.</p></div>
        <div className="grid grid-cols-2 gap-8 sm:grid-cols-3">
          <div>
            <p className="text-xs font-bold uppercase tracking-wider">Product</p>
            {footerProduct.map(x => <a href="#features" className="mt-3 block text-sm text-muted-foreground hover:text-foreground" key={x}>{x}</a>)}
          </div>
          <div>
            <p className="text-xs font-bold uppercase tracking-wider">Company</p>
            {footerCompany.map(x => <a href="mailto:hello@orbitops.io" className="mt-3 block text-sm text-muted-foreground hover:text-foreground" key={x}>{x}</a>)}
          </div>
          <div>
            <p className="text-xs font-bold uppercase tracking-wider">Legal</p>
            {footerLegal.map(x => <a href="#top" className="mt-3 block text-sm text-muted-foreground hover:text-foreground" key={x}>{x}</a>)}
          </div>
        </div>
      </div>
      <div className="mx-auto mt-12 flex max-w-6xl flex-col justify-between gap-3 border-t pt-6 text-xs text-muted-foreground sm:flex-row">
        <span>© 2026 RJ Industries. All rights reserved.</span>
        <span className="flex items-center gap-2"><span className="size-2 rounded-full bg-emerald-500" />All systems operational</span>
      </div>
    </footer>
  </div>;
}