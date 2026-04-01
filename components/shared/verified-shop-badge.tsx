"use client";

import { BadgeCheck } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

type VerifiedShopBadgeProps = {
  label?: string;
  className?: string;
};

export function VerifiedShopBadge({ label = "Verified Shop", className }: VerifiedShopBadgeProps) {
  return (
    <Badge
      variant="outline"
      className={cn(
        "inline-flex items-center gap-1.5 border-uva-blue/20 bg-uva-blue/[0.07] text-uva-blue dark:border-white/16 dark:bg-white/[0.08] dark:text-white",
        className
      )}
    >
      <BadgeCheck className="h-3.5 w-3.5" />
      {label}
    </Badge>
  );
}
