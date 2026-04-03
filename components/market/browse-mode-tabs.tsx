"use client";

import Link from "next/link";
import { Map, Search } from "lucide-react";

import { cn } from "@/lib/utils";

type BrowseModeTabsProps = {
  active: "feed" | "map";
  className?: string;
};

export function BrowseModeTabs({ active, className }: BrowseModeTabsProps) {
  return (
    <div className={cn("surface-panel inline-flex w-full items-center gap-1 rounded-full p-1 sm:w-auto", className)}>
      <Link
        href="/market"
        className={cn(
          "inline-flex min-h-10 items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold transition",
          active === "feed"
            ? "surface-pill text-foreground dark:text-white"
            : "text-muted-foreground hover:bg-card/70 hover:text-foreground dark:hover:bg-white/[0.08] dark:hover:text-white"
        )}
      >
        <Search className="h-4 w-4" />
        Feed
      </Link>
      <Link
        href="/map"
        className={cn(
          "inline-flex min-h-10 items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold transition",
          active === "map"
            ? "surface-pill text-foreground dark:text-white"
            : "text-muted-foreground hover:bg-card/70 hover:text-foreground dark:hover:bg-white/[0.08] dark:hover:text-white"
        )}
      >
        <Map className="h-4 w-4" />
        Map
      </Link>
    </div>
  );
}
