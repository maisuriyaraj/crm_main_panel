"use client";

import { useMemo } from "react";
import { format, startOfWeek } from "date-fns";
import { Bar, BarChart, CartesianGrid, Line, LineChart, XAxis, YAxis } from "recharts";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";
import type { Lead, LeadStage, LeadTemperature } from "@/lib/leads/types";

interface LeadAnalyticsProps {
  leads: Lead[];
  statuses: LeadStage[];
}

const TEMPERATURE_LABEL: Record<LeadTemperature, string> = {
  hot: "Hot",
  warm: "Warm",
  cold: "Cold",
};

const funnelConfig: ChartConfig = {
  count: { label: "Leads", color: "var(--chart-1)" },
};

const trendConfig: ChartConfig = {
  count: { label: "New Leads", color: "var(--chart-2)" },
};

const formatCurrency = (value: number) => `₹${value.toLocaleString("en-IN")}`;

export function LeadAnalytics({ leads, statuses }: LeadAnalyticsProps) {
  const stages = useMemo(() => [...statuses].sort((a, b) => a.sortOrder - b.sortOrder), [statuses]);

  const stats = useMemo(() => {
    const wonStageIds = new Set(stages.filter((s) => s.isWon).map((s) => s.id));
    const lostStageIds = new Set(stages.filter((s) => s.isLost).map((s) => s.id));

    const nonLost = leads.filter((lead) => !lostStageIds.has(lead.statusId));
    const pipelineValue = nonLost.reduce((sum, lead) => sum + (lead.value ?? 0), 0);

    const wonCount = leads.filter((lead) => wonStageIds.has(lead.statusId)).length;
    const lostCount = leads.filter((lead) => lostStageIds.has(lead.statusId)).length;
    const closedCount = wonCount + lostCount;
    const winRate = closedCount > 0 ? Math.round((wonCount / closedCount) * 100) : 0;

    const avgDealSize = leads.length > 0
      ? Math.round(leads.reduce((sum, lead) => sum + (lead.value ?? 0), 0) / leads.length)
      : 0;

    const temperatureCounts: Record<LeadTemperature, number> = { hot: 0, warm: 0, cold: 0 };
    leads.forEach((lead) => temperatureCounts[lead.temperature]++);

    return { pipelineValue, winRate, avgDealSize, temperatureCounts, totalLeads: leads.length };
  }, [leads, stages]);

  const funnelData = useMemo(
    () => stages.map((stage) => ({
      name: stage.name,
      count: leads.filter((lead) => lead.statusId === stage.id).length,
    })),
    [leads, stages],
  );

  const trendData = useMemo(() => {
    const buckets = new Map<string, number>();
    leads.forEach((lead) => {
      const weekStart = startOfWeek(new Date(lead.createdAt));
      const key = format(weekStart, "MMM d");
      buckets.set(key, (buckets.get(key) ?? 0) + 1);
    });
    return Array.from(buckets.entries())
      .map(([week, count]) => ({ week, count }))
      .sort((a, b) => new Date(a.week).getTime() - new Date(b.week).getTime());
  }, [leads]);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Leads</CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-bold">{stats.totalLeads}</CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Pipeline Value</CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-bold">{formatCurrency(stats.pipelineValue)}</CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Win Rate</CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-bold">{stats.winRate}%</CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Avg Deal Size</CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-bold">{formatCurrency(stats.avgDealSize)}</CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">Leads by Temperature</CardTitle>
        </CardHeader>
        <CardContent className="flex gap-6">
          {(Object.keys(TEMPERATURE_LABEL) as LeadTemperature[]).map((temp) => (
            <div key={temp}>
              <p className="text-xl font-semibold">{stats.temperatureCounts[temp]}</p>
              <p className="text-xs text-muted-foreground">{TEMPERATURE_LABEL[temp]}</p>
            </div>
          ))}
        </CardContent>
      </Card>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">Pipeline Funnel</CardTitle>
          </CardHeader>
          <CardContent>
            <ChartContainer config={funnelConfig} className="h-64 w-full">
              <BarChart data={funnelData}>
                <CartesianGrid vertical={false} />
                <XAxis dataKey="name" tickLine={false} axisLine={false} fontSize={12} />
                <YAxis allowDecimals={false} tickLine={false} axisLine={false} fontSize={12} />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Bar dataKey="count" fill="var(--color-count)" radius={4} />
              </BarChart>
            </ChartContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">New Leads Over Time</CardTitle>
          </CardHeader>
          <CardContent>
            <ChartContainer config={trendConfig} className="h-64 w-full">
              <LineChart data={trendData}>
                <CartesianGrid vertical={false} />
                <XAxis dataKey="week" tickLine={false} axisLine={false} fontSize={12} />
                <YAxis allowDecimals={false} tickLine={false} axisLine={false} fontSize={12} />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Line type="monotone" dataKey="count" stroke="var(--color-count)" strokeWidth={2} dot={false} />
              </LineChart>
            </ChartContainer>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
