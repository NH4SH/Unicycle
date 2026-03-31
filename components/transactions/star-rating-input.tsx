"use client";

import { motion } from "framer-motion";
import { Star } from "lucide-react";

import { cn } from "@/lib/utils";

export function StarRatingInput({
  value,
  onChange,
  label = "Seller rating"
}: {
  value: number;
  onChange: (value: number) => void;
  label?: string;
}) {
  return (
    <div className="space-y-3">
      <div className="space-y-1">
        <p className="text-sm font-medium text-foreground">{label}</p>
        <p className="text-sm text-muted-foreground">Optional, but helpful for fellow Hoos deciding who to trust.</p>
      </div>
      <div className="flex items-center gap-2" role="radiogroup" aria-label={label}>
        {Array.from({ length: 5 }, (_, index) => {
          const score = index + 1;
          const active = score <= value;

          return (
            <motion.button
              key={score}
              type="button"
              whileTap={{ scale: 0.92 }}
              whileHover={{ y: -1 }}
              onClick={() => onChange(score)}
              className={cn(
                "inline-flex h-11 w-11 items-center justify-center rounded-full border transition",
                active
                  ? "border-uva-orange/30 bg-uva-orange/12 text-uva-orange"
                  : "border-border bg-card/70 text-muted-foreground hover:border-uva-blue/20 hover:text-uva-blue"
              )}
              aria-label={`${score} star${score === 1 ? "" : "s"}`}
              aria-checked={active}
              role="radio"
            >
              <Star className={cn("h-5 w-5", active && "fill-current")} />
            </motion.button>
          );
        })}
      </div>
    </div>
  );
}
