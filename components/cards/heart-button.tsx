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
      toast.error("Could not save this drop right now.");
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
        "inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-semibold transition",
        favorited
          ? "border-uva-orange/40 bg-uva-orange/10 text-uva-orange"
          : "border-border bg-white text-muted-foreground hover:border-electric hover:text-electric",
        className
      )}
    >
      <motion.span
        animate={{ scale: favorited ? [1, 1.28, 1] : 1 }}
        transition={{ duration: 0.3, ease: "easeOut" }}
      >
        <Heart className={cn("h-4 w-4", favorited && "fill-current")} />
      </motion.span>
      {count}
    </motion.button>
  );
}
