"use client";

import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { ExternalLink, Loader2 } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import type { SellerPayoutState } from "@/lib/seller-payouts";

type PayoutSetupButtonProps = {
  viewerSignedIn: boolean;
  payoutsConfigured: boolean;
  payoutState: SellerPayoutState;
  callbackPath?: string;
  className?: string;
  size?: React.ComponentProps<typeof Button>["size"];
  variant?: React.ComponentProps<typeof Button>["variant"];
};

export function PayoutSetupButton({
  viewerSignedIn,
  payoutsConfigured,
  payoutState,
  callbackPath = "/payments",
  className,
  size,
  variant
}: PayoutSetupButtonProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function openPayoutSetup() {
    if (!viewerSignedIn) {
      router.push(`/sign-in?callbackUrl=${encodeURIComponent(callbackPath)}`);
      return;
    }

    if (!payoutsConfigured) {
      toast.error("Stripe payouts are not configured in this environment yet.");
      return;
    }

    setLoading(true);

    try {
      if (!payoutState.connectedAccount) {
        const createResponse = await fetch("/api/connect/account", {
          method: "POST"
        });
        const createData = (await createResponse.json().catch(() => null)) as { message?: string } | null;

        if (!createResponse.ok) {
          toast.error(createData?.message || "Could not start payout setup.");
          return;
        }
      }

      const onboardingResponse = await fetch("/api/connect/account/onboarding", {
        method: "POST"
      });
      const onboardingData = (await onboardingResponse.json().catch(() => null)) as { url?: string; message?: string } | null;

      if (!onboardingResponse.ok || !onboardingData?.url) {
        toast.error(onboardingData?.message || "Could not open Stripe payout setup.");
        return;
      }

      window.location.href = onboardingData.url;
    } finally {
      setLoading(false);
    }
  }

  if (!viewerSignedIn) {
    return (
      <Button asChild className={className} size={size} variant={variant}>
        <Link href={`/sign-in?callbackUrl=${encodeURIComponent(callbackPath)}`}>{payoutState.ctaLabel}</Link>
      </Button>
    );
  }

  return (
    <Button type="button" onClick={openPayoutSetup} disabled={loading || !payoutsConfigured} className={className} size={size} variant={variant}>
      {loading ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> : <ExternalLink className="mr-1.5 h-4 w-4" />}
      {loading ? "Opening Stripe..." : payoutState.ctaLabel}
    </Button>
  );
}

