import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center rounded-full border px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] transition-colors",
  {
    variants: {
      variant: {
        default: "border-transparent bg-secondary text-secondary-foreground",
        orange: "border-uva-orange/18 bg-uva-orange/12 text-uva-orange dark:border-uva-orange/24 dark:bg-uva-orange/[0.16] dark:text-orange-100",
        blue: "border-uva-blue/15 bg-uva-blue/10 text-uva-blue dark:border-white/14 dark:bg-white/[0.08] dark:text-white/93",
        outline: "border-border bg-card/70 text-foreground"
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
