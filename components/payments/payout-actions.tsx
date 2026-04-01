"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { WalletCards } from "lucide-react";

import { PayoutSetupButton } from "@/components/payments/payout-setup-button";
import { Button } from "@/components/ui/button";
import type { SellerPayoutState } from "@/lib/seller-payouts";

type PayoutActionsProps = {
  viewerSignedIn: boolean;
  payoutsConfigured: boolean;
  payoutState: SellerPayoutState;
};

export function PayoutActions({ viewerSignedIn, payoutsConfigured, payoutState }: PayoutActionsProps) {
  const router = useRouter();

  if (!viewerSignedIn) {
    return (
      <Button asChild>
        <Link href="/sign-in?callbackUrl=%2Fpayments">Sign in to connect payouts</Link>
      </Button>
    );
  }

  if (payoutState.ctaTarget === "sell") {
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

  if (payoutState.ctaTarget === "refresh" || payoutState.ctaTarget === "none") {
    return (
      <div className="flex flex-wrap gap-3">
        <Button type="button" onClick={() => router.refresh()}>
          {payoutState.ctaLabel}
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-wrap gap-3">
      <PayoutSetupButton viewerSignedIn={viewerSignedIn} payoutsConfigured={payoutsConfigured} payoutState={payoutState} />
      <Button type="button" variant="secondary" onClick={() => router.refresh()}>
        Refresh status
      </Button>
    </div>
  );
}
