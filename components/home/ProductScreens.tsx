"use client";

import { AnimatePresence, motion } from "framer-motion";
import { ArrowDownRight, ArrowUpRight, BarChart3, CircleDollarSign, Filter, LayoutDashboard, Megaphone, MoreHorizontal, Pause, Play, Receipt, Search, Star, Target, TrendingUp, Users } from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";

const screens = [
  { key: "crm", tab: "CRM Dashboard", title: "CRM Dashboard", path: "dashboard", Icon: LayoutDashboard },
  { key: "pipeline", tab: "Sales Pipeline", title: "Sales Pipeline", path: "pipeline", Icon: Target },
  { key: "leads", tab: "Lead Management", title: "Lead Management", path: "leads", Icon: Users },
  { key: "analytics", tab: "Analytics", title: "Analytics Dashboard", path: "analytics", Icon: BarChart3 },
  { key: "ads", tab: "Ads Dashboard", title: "Ads Dashboard", path: "ads", Icon: Megaphone },
  { key: "billing", tab: "Billing", title: "Billing Overview", path: "billing", Icon: Receipt },
] as const;

const rise = { hidden: { opacity: 0, y: 12 }, show: { opacity: 1, y: 0 } };
const stagger = { hidden: {}, show: { transition: { staggerChildren: 0.05 } } };

function Card({ className, children }: { className?: string; children: React.ReactNode }) {
  return <motion.div variants={rise} className={cn("rounded-xl border bg-card p-4", className)}>{children}</motion.div>;
}

function Kpi({ label, value, change, down }: { label: string; value: string; change: string; down?: boolean }) {
  return <Card>
    <p className="text-[11px] text-muted-foreground">{label}</p>
    <p className="mt-1 text-lg font-bold sm:text-xl">{value}</p>
    <span className={cn("mt-1 inline-flex items-center gap-0.5 text-[11px] font-semibold", down ? "text-destructive" : "text-emerald-600")}>
      {down ? <ArrowDownRight className="size-3" /> : <ArrowUpRight className="size-3" />}{change}
    </span>
  </Card>;
}

function Bars({ heights, className }: { heights: number[]; className?: string }) {
  return <div className={cn("flex items-end gap-2", className)}>
    {heights.map((h, i) => (
      <motion.div key={i} initial={{ height: 0 }} animate={{ height: `${h}%` }} transition={{ delay: 0.15 + i * 0.04, type: "spring", stiffness: 120, damping: 18 }}
        className="flex-1 rounded-t-sm bg-primary" style={{ opacity: 0.35 + (i / heights.length) * 0.65 }} />
    ))}
  </div>;
}

function Badge({ tone, children }: { tone: "green" | "amber" | "red" | "muted"; children: React.ReactNode }) {
  const tones = { green: "bg-emerald-500/10 text-emerald-600", amber: "bg-amber-500/10 text-amber-600", red: "bg-destructive/10 text-destructive", muted: "bg-muted text-muted-foreground" };
  return <span className={cn("whitespace-nowrap rounded-full px-2 py-0.5 text-[10px] font-semibold", tones[tone])}>{children}</span>;
}

function Avatar({ name }: { name: string }) {
  return <span className="grid size-7 shrink-0 place-items-center rounded-full bg-primary/10 text-[10px] font-bold text-primary">{name.split(" ").map(p => p[0]).join("")}</span>;
}

function CrmScreen() {
  const activity = [
    { name: "Olivia Martin", text: "moved Acme deal to Proposal", time: "2m" },
    { name: "Jackson Lee", text: "booked a demo call", time: "18m" },
    { name: "Sofia Davis", text: "paid invoice #1043", time: "1h" },
    { name: "Liam Turner", text: "replied to nurture email", time: "3h" },
  ];
  return <>
    <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
      <Kpi label="Total revenue" value="$184,240" change="18.2%" />
      <Kpi label="New leads" value="1,429" change="8.4%" />
      <Kpi label="Deals won" value="184" change="12.1%" />
      <Kpi label="Churn rate" value="1.8%" change="0.3%" down />
    </div>
    <div className="mt-3 grid gap-3 lg:grid-cols-[1.6fr_1fr]">
      <Card>
        <div className="mb-4 flex items-center justify-between"><b className="text-sm">Revenue overview</b><Badge tone="muted">Last 12 months</Badge></div>
        <Bars heights={[35, 48, 41, 62, 54, 74, 68, 86, 71, 92, 82, 100]} className="h-44" />
      </Card>
      <Card>
        <b className="text-sm">Recent activity</b>
        <div className="mt-4 space-y-3.5">
          {activity.map(a => (
            <div key={a.name} className="flex items-center gap-3">
              <Avatar name={a.name} />
              <p className="min-w-0 flex-1 truncate text-xs"><b>{a.name}</b> <span className="text-muted-foreground">{a.text}</span></p>
              <span className="text-[10px] text-muted-foreground">{a.time}</span>
            </div>
          ))}
        </div>
      </Card>
    </div>
  </>;
}

function PipelineScreen() {
  const columns = [
    { stage: "Qualified", total: "$84k", deals: [{ co: "Acme Corp", v: "$24k", p: 30 }, { co: "Globex", v: "$18k", p: 25 }, { co: "Initech", v: "$12k", p: 20 }] },
    { stage: "Proposal", total: "$62k", deals: [{ co: "Umbrella", v: "$32k", p: 55 }, { co: "Hooli", v: "$30k", p: 50 }] },
    { stage: "Negotiation", total: "$41k", deals: [{ co: "Stark Ind.", v: "$26k", p: 75 }, { co: "Wayne Co.", v: "$15k", p: 70 }] },
    { stage: "Closed won", total: "$32k", deals: [{ co: "Soylent", v: "$32k", p: 100 }] },
  ];
  return <>
    <div className="mb-3 flex items-center justify-between">
      <div className="flex gap-2"><Badge tone="green">Weighted forecast $142k</Badge><Badge tone="muted">8 open deals</Badge></div>
      <span className="hidden items-center gap-1 text-[11px] text-muted-foreground sm:flex"><Filter className="size-3" /> All owners</span>
    </div>
    <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
      {columns.map((col, ci) => (
        <motion.div key={col.stage} variants={rise} className="rounded-xl bg-secondary p-3">
          <div className="mb-3 flex items-center justify-between text-xs"><b>{col.stage}</b><span className="text-muted-foreground">{col.total}</span></div>
          <div className="space-y-2">
            {col.deals.map((d, di) => (
              <motion.div key={d.co} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.15 + ci * 0.08 + di * 0.05 }}
                className="rounded-lg border bg-card p-3 transition hover:-translate-y-0.5 hover:shadow-md">
                <div className="flex items-center justify-between"><b className="text-xs">{d.co}</b><MoreHorizontal className="size-3.5 text-muted-foreground" /></div>
                <p className="mt-1 text-sm font-bold">{d.v}</p>
                <div className="mt-2 h-1 rounded-full bg-muted"><div className="h-full rounded-full bg-primary" style={{ width: `${d.p}%` }} /></div>
              </motion.div>
            ))}
          </div>
        </motion.div>
      ))}
    </div>
  </>;
}

function LeadsScreen() {
  const segments = [{ label: "All leads", n: 1429, on: true }, { label: "Hot", n: 214 }, { label: "Needs follow-up", n: 87 }, { label: "From Meta Ads", n: 392 }, { label: "Unassigned", n: 31 }];
  const leads = [
    { name: "Emma Wilson", co: "Brightline", src: "Meta Ads", score: 92, status: ["Hot", "green"] },
    { name: "Noah Patel", co: "Northstar", src: "Website", score: 78, status: ["Contacted", "amber"] },
    { name: "Ava Johnson", co: "Vertex", src: "Referral", score: 64, status: ["New", "muted"] },
    { name: "Lucas Kim", co: "Summit", src: "Google", score: 85, status: ["Hot", "green"] },
    { name: "Mia Garcia", co: "Aperture", src: "Webinar", score: 41, status: ["Cold", "red"] },
  ] as const;
  return <div className="grid gap-3 md:grid-cols-[200px_1fr]">
    <Card className="bg-secondary p-3">
      <p className="mb-3 px-1 text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Segments</p>
      {segments.map(s => (
        <div key={s.label} className={cn("mb-1 flex items-center justify-between rounded-lg px-2.5 py-2 text-xs", s.on ? "bg-card font-semibold text-primary shadow-sm" : "text-muted-foreground")}>
          {s.label}<span className="text-[10px]">{s.n}</span>
        </div>
      ))}
    </Card>
    <Card className="p-0">
      <div className="flex items-center gap-2 border-b p-3">
        <div className="flex flex-1 items-center gap-2 rounded-lg bg-muted px-3 py-1.5 text-[11px] text-muted-foreground"><Search className="size-3" />Search leads…</div>
        <span className="rounded-lg bg-primary px-3 py-1.5 text-[11px] font-semibold text-primary-foreground">+ Add lead</span>
      </div>
      <div className="divide-y">
        {leads.map((l, i) => (
          <motion.div key={l.name} initial={{ opacity: 0, x: 12 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.15 + i * 0.06 }}
            className="grid grid-cols-[1fr_auto] items-center gap-3 px-3 py-2.5 transition hover:bg-secondary/60 sm:grid-cols-[1.4fr_.8fr_1fr_auto]">
            <div className="flex min-w-0 items-center gap-2.5"><Avatar name={l.name} /><div className="min-w-0"><p className="truncate text-xs font-semibold">{l.name}</p><p className="truncate text-[10px] text-muted-foreground">{l.co}</p></div></div>
            <span className="hidden text-[11px] text-muted-foreground sm:block">{l.src}</span>
            <div className="hidden items-center gap-2 sm:flex">
              <div className="h-1.5 flex-1 rounded-full bg-muted"><motion.div initial={{ width: 0 }} animate={{ width: `${l.score}%` }} transition={{ delay: 0.3 + i * 0.06, duration: 0.6 }} className="h-full rounded-full bg-primary" /></div>
              <span className="w-6 text-[10px] font-bold">{l.score}</span>
            </div>
            <Badge tone={l.status[1]}>{l.status[0]}</Badge>
          </motion.div>
        ))}
      </div>
    </Card>
  </div>;
}

function AnalyticsScreen() {
  const current = [30, 42, 38, 55, 50, 68, 62, 78, 74, 90];
  const previous = [25, 30, 35, 33, 42, 45, 48, 52, 56, 60];
  const toPath = (pts: number[]) => pts.map((v, i) => `${i === 0 ? "M" : "L"}${(i / (pts.length - 1)) * 300},${100 - v}`).join(" ");
  const funnel = [{ label: "Visitors", v: "48.2k", w: 100 }, { label: "Leads", v: "6.1k", w: 72 }, { label: "Qualified", v: "2.4k", w: 48 }, { label: "Customers", v: "612", w: 26 }];
  return <>
    <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
      <Kpi label="Conversion rate" value="4.7%" change="0.9%" />
      <Kpi label="Avg. deal size" value="$8,420" change="6.3%" />
      <Kpi label="Sales cycle" value="21 days" change="3 days" />
      <Kpi label="Bounce rate" value="38%" change="2.1%" down />
    </div>
    <div className="mt-3 grid gap-3 lg:grid-cols-[1.6fr_1fr]">
      <Card>
        <div className="mb-3 flex items-center justify-between">
          <b className="text-sm">Revenue trend</b>
          <div className="flex gap-3 text-[10px] text-muted-foreground">
            <span className="flex items-center gap-1"><span className="size-2 rounded-full bg-primary" />This year</span>
            <span className="flex items-center gap-1"><span className="size-2 rounded-full bg-muted-foreground/40" />Last year</span>
          </div>
        </div>
        <svg viewBox="0 0 300 100" preserveAspectRatio="none" className="h-44 w-full overflow-visible text-primary">
          <defs><linearGradient id="trend-fill" x1="0" x2="0" y1="0" y2="1"><stop offset="0%" stopColor="currentColor" stopOpacity="0.25" /><stop offset="100%" stopColor="currentColor" stopOpacity="0" /></linearGradient></defs>
          {[25, 50, 75].map(y => <line key={y} x1="0" x2="300" y1={y} y2={y} className="stroke-border" strokeWidth="0.5" vectorEffect="non-scaling-stroke" />)}
          <motion.path d={`${toPath(current)} L300,100 L0,100 Z`} fill="url(#trend-fill)" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.6 }} />
          <motion.path d={toPath(previous)} fill="none" className="stroke-muted-foreground/40" strokeWidth="2" strokeDasharray="4 4" vectorEffect="non-scaling-stroke" initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ duration: 1 }} />
          <motion.path d={toPath(current)} fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" vectorEffect="non-scaling-stroke" initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ duration: 1.1, ease: "easeOut" }} />
        </svg>
      </Card>
      <Card>
        <b className="text-sm">Conversion funnel</b>
        <div className="mt-4 space-y-3">
          {funnel.map((f, i) => (
            <div key={f.label}>
              <div className="mb-1 flex justify-between text-[11px]"><span className="text-muted-foreground">{f.label}</span><b>{f.v}</b></div>
              <div className="h-6 rounded-md bg-muted">
                <motion.div initial={{ width: 0 }} animate={{ width: `${f.w}%` }} transition={{ delay: 0.2 + i * 0.1, duration: 0.6 }} className="h-full rounded-md bg-primary" style={{ opacity: 1 - i * 0.18 }} />
              </div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  </>;
}

function AdsScreen() {
  const campaigns = [
    { name: "Spring Launch — Lookalike", spend: "$4,820", roas: "5.6x", ctr: "3.2%", live: true, trend: [40, 55, 48, 70, 82] },
    { name: "Retargeting — Cart Abandon", spend: "$2,140", roas: "7.1x", ctr: "4.8%", live: true, trend: [50, 62, 58, 75, 90] },
    { name: "Webinar Signups — Broad", spend: "$1,390", roas: "2.4x", ctr: "1.6%", live: false, trend: [60, 52, 45, 40, 35] },
    { name: "Brand Awareness — Video", spend: "$3,050", roas: "3.8x", ctr: "2.1%", live: true, trend: [30, 42, 50, 48, 60] },
  ];
  return <>
    <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
      <Kpi label="Ad spend" value="$11,400" change="9.2%" />
      <Kpi label="Ad revenue" value="$54,720" change="22.5%" />
      <Kpi label="Blended ROAS" value="4.8x" change="0.6x" />
      <Kpi label="Cost per lead" value="$7.90" change="$1.20" />
    </div>
    <Card className="mt-3 p-0">
      <div className="flex items-center justify-between border-b p-3"><b className="text-sm">Active campaigns</b><Badge tone="green">Synced with Meta Ads</Badge></div>
      <div className="divide-y">
        {campaigns.map((c, i) => (
          <motion.div key={c.name} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 + i * 0.07 }}
            className="grid grid-cols-[auto_1fr_auto] items-center gap-3 px-3 py-3 transition hover:bg-secondary/60 sm:grid-cols-[auto_1.6fr_.6fr_.6fr_.6fr_80px]">
            <span className={cn("grid size-7 place-items-center rounded-lg", c.live ? "bg-emerald-500/10 text-emerald-600" : "bg-muted text-muted-foreground")}>{c.live ? <Play className="size-3" /> : <Pause className="size-3" />}</span>
            <p className="truncate text-xs font-semibold">{c.name}</p>
            <span className="hidden text-[11px] text-muted-foreground sm:block">{c.spend}</span>
            <b className="text-xs text-primary">{c.roas}</b>
            <span className="hidden text-[11px] text-muted-foreground sm:block">CTR {c.ctr}</span>
            <div className="hidden h-6 items-end gap-0.5 sm:flex">
              {c.trend.map((h, j) => <span key={j} className={cn("flex-1 rounded-t-[2px]", c.live ? "bg-primary/70" : "bg-muted-foreground/30")} style={{ height: `${h}%` }} />)}
            </div>
          </motion.div>
        ))}
      </div>
    </Card>
  </>;
}

function BillingScreen() {
  const invoices = [
    { id: "INV-1048", client: "Northstar Inc.", amount: "$4,200", status: ["Paid", "green"] },
    { id: "INV-1047", client: "Brightline Agency", amount: "$1,850", status: ["Pending", "amber"] },
    { id: "INV-1046", client: "Grove & Co.", amount: "$3,120", status: ["Paid", "green"] },
    { id: "INV-1045", client: "Vertex Labs", amount: "$920", status: ["Overdue", "red"] },
  ] as const;
  const plans = [{ label: "Growth", pct: 46, cls: "text-primary" }, { label: "Business", pct: 32, cls: "text-emerald-500" }, { label: "Starter", pct: 22, cls: "text-lime-400" }];
  const circumference = 2 * Math.PI * 40;
  let offset = 0;
  return <div className="grid gap-3 lg:grid-cols-[1fr_1.5fr]">
    <div className="space-y-3">
      <Card className="bg-primary text-primary-foreground">
        <div className="flex items-center justify-between"><p className="text-[11px] opacity-80">Monthly recurring revenue</p><CircleDollarSign className="size-4 opacity-80" /></div>
        <p className="mt-1 text-2xl font-bold">$48,920</p>
        <span className="mt-1 inline-flex items-center gap-1 text-[11px] opacity-90"><TrendingUp className="size-3" /> +11.4% this month</span>
      </Card>
      <Card>
        <b className="text-sm">Revenue by plan</b>
        <div className="mt-3 flex items-center gap-4">
          <svg viewBox="0 0 100 100" className="size-24 -rotate-90">
            <circle cx="50" cy="50" r="40" fill="none" strokeWidth="14" className="stroke-muted" />
            {plans.map((p, i) => {
              const len = (p.pct / 100) * circumference;
              const el = <motion.circle key={p.label} cx="50" cy="50" r="40" fill="none" stroke="currentColor" strokeWidth="14" className={p.cls}
                strokeDashoffset={-offset} initial={{ strokeDasharray: `0 ${circumference}` }} animate={{ strokeDasharray: `${len} ${circumference}` }} transition={{ delay: 0.2 + i * 0.15, duration: 0.6 }} />;
              offset += len;
              return el;
            })}
          </svg>
          <div className="space-y-2">
            {plans.map(p => <div key={p.label} className="flex items-center gap-2 text-[11px]"><span className={cn("size-2 rounded-full bg-current", p.cls)} />{p.label}<b className="ml-1">{p.pct}%</b></div>)}
          </div>
        </div>
      </Card>
    </div>
    <Card className="p-0">
      <div className="flex items-center justify-between border-b p-3"><b className="text-sm">Recent invoices</b><span className="text-[11px] font-semibold text-primary">View all</span></div>
      <div className="divide-y">
        {invoices.map((inv, i) => (
          <motion.div key={inv.id} initial={{ opacity: 0, x: 12 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.15 + i * 0.07 }}
            className="flex items-center gap-3 px-3 py-3.5 transition hover:bg-secondary/60">
            <span className="grid size-8 place-items-center rounded-lg bg-secondary"><Receipt className="size-3.5 text-primary" /></span>
            <div className="min-w-0 flex-1"><p className="truncate text-xs font-semibold">{inv.client}</p><p className="text-[10px] text-muted-foreground">{inv.id}</p></div>
            <b className="text-xs">{inv.amount}</b>
            <Badge tone={inv.status[1]}>{inv.status[0]}</Badge>
          </motion.div>
        ))}
      </div>
      <div className="flex items-center gap-2 border-t p-3 text-[11px] text-muted-foreground"><Star className="size-3 text-primary" /> 96% of invoices paid on time this quarter</div>
    </Card>
  </div>;
}

const screenViews = { crm: CrmScreen, pipeline: PipelineScreen, leads: LeadsScreen, analytics: AnalyticsScreen, ads: AdsScreen, billing: BillingScreen };

export function ProductScreens() {
  const [active, setActive] = useState(0);
  const screen = screens[active];
  const View = screenViews[screen.key];

  return <div className="mx-auto max-w-6xl">
    <div role="tablist" className="mb-6 flex gap-1 overflow-x-auto rounded-full border bg-card p-1 shadow-sm sm:mx-auto sm:w-fit">
      {screens.map(({ key, tab, Icon }, i) => (
        <button key={key} role="tab" aria-selected={active === i} onClick={() => setActive(i)}
          className={cn("relative flex shrink-0 items-center gap-2 rounded-full px-4 py-2 text-sm font-medium transition-colors", active === i ? "text-primary-foreground" : "text-muted-foreground hover:text-foreground")}>
          {active === i && <motion.span layoutId="screen-tab-pill" className="absolute inset-0 rounded-full bg-primary shadow-[var(--shadow-primary)]" transition={{ type: "spring", stiffness: 380, damping: 32 }} />}
          <Icon className="relative size-4" /><span className="relative">{tab}</span>
        </button>
      ))}
    </div>

    <div className="relative">
      <div className="absolute -inset-10 -z-10 ambient-glow opacity-60 blur-3xl" />
      <div className="overflow-hidden rounded-2xl border bg-card panel-shadow">
        <div className="flex h-12 items-center gap-2 border-b px-5">
          <span className="size-2.5 rounded-full bg-destructive" />
          <span className="size-2.5 rounded-full bg-lime-400" />
          <span className="size-2.5 rounded-full bg-emerald-500" />
          <span className="ml-4 text-xs font-medium text-muted-foreground">{screen.title}</span>
          <span className="mx-auto hidden rounded-md bg-muted px-16 py-1 text-[10px] text-muted-foreground md:block">app.orbitops.io/{screen.path}</span>
          <span className="ml-auto flex items-center gap-1.5 text-[10px] font-semibold text-emerald-600 md:ml-0">
            <span className="relative flex size-2"><span className="absolute inline-flex size-full animate-ping rounded-full bg-emerald-500 opacity-60" /><span className="relative size-2 rounded-full bg-emerald-500" /></span>Live
          </span>
        </div>
        <div className="min-h-[440px] bg-secondary/30 p-4 sm:p-5">
          <AnimatePresence mode="wait">
            <motion.div key={screen.key} variants={stagger} initial="hidden" animate="show" exit={{ opacity: 0, y: -8, transition: { duration: 0.15 } }}>
              <View />
            </motion.div>
          </AnimatePresence>
        </div>
      </div>
    </div>
  </div>;
}
