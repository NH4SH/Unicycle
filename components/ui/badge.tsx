import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center rounded-full border px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] transition-colors",
  {
    variants: {
      variant: {
        default: "border-transparent bg-secondary text-secondary-foreground",
        orange:
          "border-uva-orange/18 bg-uva-orange/12 text-uva-orange dark:border-uva-orange/34 dark:bg-uva-orange/[0.2] dark:text-orange-50 dark:shadow-[0_10px_24px_rgba(229,114,0,0.12)]",
        blue:
          "border-uva-blue/16 bg-uva-blue/10 text-uva-blue dark:border-uva-blue/34 dark:bg-uva-blue/[0.22] dark:text-blue-50 dark:shadow-[0_10px_24px_rgba(78,107,149,0.14)]",
        outline:
          "border-border bg-card/72 text-foreground dark:border-white/16 dark:bg-slate-950/82 dark:text-white/95 dark:shadow-[0_12px_28px_rgba(3,7,18,0.18)]"
      }
    },
    defaultVariants: {
      variant: "default"
    }
  }
);

export interface BadgeProps extends React.HTMLAttributes<HTMLDivElement>, VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return <div className={cn(badgeVariants({ variant }), className)} {...props} />;
}

export { Badge, badgeVariants };
