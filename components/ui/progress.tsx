"use client";

import * as React from "react";
import * as ProgressPrimitive from "@radix-ui/react-progress";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

// The fill colour; `tone` lets a bar show a state (ok, nearing a limit, full).
const progressIndicatorVariants = cva("h-full w-full flex-1 transition-all", {
  variants: {
    tone: {
      default: "bg-primary",
      success: "bg-success",
      warning: "bg-warning",
      destructive: "bg-destructive",
    },
  },
  defaultVariants: {
    tone: "default",
  },
});

const Progress = React.forwardRef<
  React.ElementRef<typeof ProgressPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof ProgressPrimitive.Root> & VariantProps<typeof progressIndicatorVariants>
>(({ className, value, tone, ...props }, ref) => (
  <ProgressPrimitive.Root
    ref={ref}
    className={cn("relative h-2 w-full overflow-hidden rounded-full bg-primary/20", className)}
    value={value}
    {...props}
  >
    <ProgressPrimitive.Indicator
      className={progressIndicatorVariants({ tone })}
      style={{ transform: `translateX(-${100 - (value || 0)}%)` }}
    />
  </ProgressPrimitive.Root>
));
Progress.displayName = ProgressPrimitive.Root.displayName;

export { Progress, progressIndicatorVariants };
