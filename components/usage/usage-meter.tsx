import type { ReactNode } from "react";

import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";
import { barPercent, formatMeasureValue, stateLabel, toneOf } from "@/lib/usage/mappers";
import type { UsageMeasure } from "@/lib/usage/types";

const STATE_TEXT = {
  ok: "text-muted-foreground",
  warning: "text-foreground",
  full: "text-destructive",
} as const;

// One measure against its limit: the figures, a bar coloured by state, and the
// state in words, since colour alone must never carry it.
export function UsageMeter({
  label,
  measure,
  unitSuffix,
  children,
}: {
  label: string;
  measure: UsageMeasure;
  unitSuffix?: string;
  children?: ReactNode;
}) {
  const used = formatMeasureValue(measure, measure.used);
  const suffix = unitSuffix ? ` ${unitSuffix}` : "";

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <span className="font-medium">{label}</span>
        <span className="text-sm text-muted-foreground">
          {measure.unlimited || measure.limit === null
            ? `${used}${suffix} · Unlimited`
            : `${used} of ${formatMeasureValue(measure, measure.limit)}${suffix}`}
          {measure.limitSource === "platform_default" ? " (platform default)" : ""}
        </span>
      </div>
      {!measure.unlimited && measure.limit !== null && (
        <>
          <Progress
            value={barPercent(measure)}
            tone={toneOf(measure.state)}
            aria-label={`${label}: ${measure.percent ?? 0}% used`}
          />
          <p className={cn("text-xs", STATE_TEXT[measure.state])}>
            {measure.percent ?? 0}% used · {stateLabel(measure.state)}
          </p>
        </>
      )}
      {children}
    </div>
  );
}
