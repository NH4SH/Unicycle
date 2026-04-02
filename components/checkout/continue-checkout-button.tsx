"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, WalletCards } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";

export function ContinueCheckoutButton({ listingId }: { listingId: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function continueToStripe() {
    setLoading(true);
    const response = await fetch("/api/checkout/session", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ listingId })
    });

    setLoading(false);

    if (!response.ok) {
      const data = (await response.json().catch(() => null)) as { message?: string } | null;
      toast.error(data?.message || "Could not start secure checkout.");
      router.refresh();
      return;
    }

    const data = (await response.json()) as { url?: string };
    if (!data.url) {
      toast.error("Stripe checkout link was missing.");
      return;
    }

    window.location.href = data.url;
  }

  return (
    <Button size="lg" className="w-full" onClick={continueToStripe} disabled={loading}>
      {loading ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> : <WalletCards className="mr-1.5 h-4 w-4" />}
      {loading ? (
        <>
          <span className="sm:hidden">To Stripe...</span>
          <span className="hidden sm:inline">Redirecting to Stripe...</span>
        </>
      ) : (
        <>
          <span className="sm:hidden">Continue to Stripe</span>
          <span className="hidden sm:inline">Continue to secure checkout</span>
        </>
      )}
    </Button>
  );
}
