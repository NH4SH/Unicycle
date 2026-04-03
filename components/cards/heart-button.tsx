"use client";

import { useState } from "react";
import { useSession } from "next-auth/react";
import { motion } from "framer-motion";
import { Heart } from "lucide-react";
import { toast } from "sonner";

import { cn } from "@/lib/utils";

type HeartButtonProps = {
  listingId: string;
  initialFavorited: boolean;
  initialCount: number;
  className?: string;
};

export function HeartButton({ listingId, initialFavorited, initialCount, className }: HeartButtonProps) {
  const { status } = useSession();
  const [favorited, setFavorited] = useState(initialFavorited);
  const [count, setCount] = useState(initialCount);
  const [loading, setLoading] = useState(false);

  async function toggleFavorite() {
    if (status !== "authenticated") {
      window.location.assign(`/sign-in?callbackUrl=${encodeURIComponent(`/listing/${listingId}`)}`);
      return;
    }

    if (loading) return;
    setLoading(true);

    const next = !favorited;
    setFavorited(next);
    setCount((prev) => prev + (next ? 1 : -1));

    try {
      const response = await fetch(`/api/listings/${listingId}/favorite`, {
        method: "POST"
      });

      if (!response.ok) {
        throw new Error("Failed to update favorite");
      }
    } catch {
      setFavorited((prev) => !prev);
      setCount((prev) => prev + (next ? -1 : 1));
      toast.error("Could not save this find right now.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <motion.button
      whileTap={{ scale: 0.92 }}
      onClick={toggleFavorite}
      aria-label={favorited ? "Remove favorite" : "Save listing"}
      className={cn(
        "touch-chip inline-flex items-center gap-2 rounded-full border text-sm font-semibold shadow-sm transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-uva-orange/55 focus-visible:ring-offset-2 focus-visible:ring-offset-background",
        favorited
          ? "border-uva-orange/60 bg-uva-orange text-white shadow-[0_12px_28px_rgba(232,119,34,0.32)] hover:border-[#f29a49] hover:bg-[#f08a33] hover:text-white dark:border-uva-orange/70 dark:bg-uva-orange dark:text-white dark:hover:border-[#f29a49] dark:hover:bg-[#f08a33] dark:hover:text-white"
          : "border-border/90 bg-card/96 text-foreground hover:border-uva-blue/35 hover:bg-card hover:text-uva-blue dark:border-white/18 dark:bg-slate-950/82 dark:text-white/96 dark:hover:border-white/28 dark:hover:bg-slate-900 dark:hover:text-white",
        className
      )}
    >
      <motion.span animate={{ scale: favorited ? [1, 1.22, 1] : 1 }} transition={{ duration: 0.3, ease: "easeOut" }}>
        <Heart className={cn("h-4 w-4 shrink-0 stroke-[2.15]", favorited && "fill-current")} />
      </motion.span>
      {count}
    </motion.button>
  );
}
