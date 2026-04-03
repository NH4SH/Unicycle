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
      variant="blue"
      className={cn(
        "inline-flex items-center gap-1.5",
        className
      )}
    >
      <BadgeCheck className="h-3.5 w-3.5" />
      {label}
    </Badge>
  );
}
