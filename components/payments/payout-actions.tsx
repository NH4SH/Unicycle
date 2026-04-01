"use client";

import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { ExternalLink, Loader2, WalletCards } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import type { SellerPayoutState } from "@/lib/seller-payouts";

type PayoutActionsProps = {
  viewerSignedIn: boolean;
  payoutsConfigured: boolean;
  payoutState: SellerPayoutState;
};

export function PayoutActions({ viewerSignedIn, payoutsConfigured, payoutState }: PayoutActionsProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function openPayoutSetup() {
    if (!viewerSignedIn) {
      router.push("/sign-in?callbackUrl=%2Fpayments");
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
      <Button asChild>
        <Link href="/sign-in?callbackUrl=%2Fpayments">Sign in to connect payouts</Link>
      </Button>
    );
  }

  if (payoutState.readyToReceivePayments) {
    return (
      <div className="flex flex-wrap gap-3">
        <Button asChild>
          <Link href="/sell">
            <WalletCards className="mr-1.5 h-4 w-4" />
            Create listing
          </Link>
        </Button>
        <Button type="button" variant="secondary" onClick={() => router.refresh()}>
          Refresh status
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-wrap gap-3">
      <Button type="button" onClick={openPayoutSetup} disabled={loading || !payoutsConfigured}>
        {loading ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> : <ExternalLink className="mr-1.5 h-4 w-4" />}
        {loading ? "Opening Stripe..." : payoutState.ctaLabel}
      </Button>
      <Button type="button" variant="secondary" onClick={() => router.refresh()}>
        Refresh status
      </Button>
    </div>
  );
}
