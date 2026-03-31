"use client";

import { motion } from "framer-motion";
import { MoonStar, SunMedium } from "lucide-react";

import { useTheme } from "@/components/providers/theme-provider";
import { cn } from "@/lib/utils";

export function ThemeToggle({ className }: { className?: string }) {
  const { theme, toggleTheme } = useTheme();
  const isDark = theme === "dark";

  return (
    <button
      type="button"
      onClick={toggleTheme}
      aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"}
      className={cn(
        "surface-pill relative inline-flex h-11 w-[4.7rem] items-center rounded-full px-1 transition hover:border-uva-orange/35 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
        className
      )}
    >
      <motion.span
        aria-hidden="true"
        initial={false}
        animate={{ x: isDark ? 34 : 0 }}
        transition={{ type: "spring", stiffness: 340, damping: 24, mass: 0.8 }}
        className={cn(
          "absolute left-1 top-1 flex h-9 w-9 items-center justify-center rounded-full shadow-soft",
          isDark ? "bg-uva-blue text-white" : "bg-uva-orange text-white"
        )}
      >
        {isDark ? <MoonStar className="h-4 w-4" /> : <SunMedium className="h-4 w-4" />}
      </motion.span>
      <span className="relative z-10 flex w-full items-center justify-between px-2.5 text-muted-foreground">
        <SunMedium className={cn("h-3.5 w-3.5 transition", !isDark ? "opacity-0" : "opacity-70")} />
        <MoonStar className={cn("h-3.5 w-3.5 transition", isDark ? "opacity-0" : "opacity-70")} />
      </span>
    </button>
  );
}
