import Link from "next/link";
import { ArrowRight, CircleAlert } from "lucide-react";

import { PayoutSetupButton } from "@/components/payments/payout-setup-button";
import { SellWizard } from "@/components/sell/sell-wizard";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { getAuthSession } from "@/lib/auth";
import { getSellerPayoutState } from "@/lib/seller-payouts";
import { isStripeConnectConfigured } from "@/lib/stripe";

export default async function SellPage() {
  const session = await getAuthSession();
  const payoutState = await getSellerPayoutState(session?.user.id);
  const payoutsConfigured = isStripeConnectConfigured();

  return (
    <div className="container space-y-6 py-8 md:space-y-8 md:py-10">
      <div className="grid gap-4 border-b border-border/80 pb-6 md:grid-cols-[1fr_auto] md:items-end">
        <div className="space-y-2">
          <p className="editorial-eyebrow">Sell on HoosFinds</p>
          <h1 className="font-display text-4xl font-extrabold tracking-tight md:text-5xl">
            Turn the piece you&apos;re done with into someone else&apos;s next fit.
          </h1>
          <p className="max-w-2xl text-sm leading-7 text-muted-foreground md:text-base">
            Create the listing here, keep pickup simple, and let HoosFinds handle payout routing underneath the sale.
          </p>
        </div>
        <div className="rounded-full border border-border bg-card/75 px-4 py-2 text-xs uppercase tracking-[0.18em] text-muted-foreground shadow-soft">
          Pickup on Grounds
        </div>
      </div>

      {!session?.user.id ? (
        <Card className="surface-panel-strong">
          <CardContent className="flex flex-col gap-4 p-6 md:flex-row md:items-center md:justify-between">
            <div className="space-y-2">
              <p className="editorial-eyebrow">Sign in first</p>
              <h2 className="font-display text-3xl font-extrabold tracking-tight">Sign in before you post a listing.</h2>
              <p className="max-w-2xl text-sm leading-7 text-muted-foreground">
                We need your UVA account so we can save your listing, connect payouts, and send earnings to the right seller.
              </p>
            </div>
            <Button asChild>
              <Link href="/sign-in?callbackUrl=%2Fsell">
                Sign in to sell
                <ArrowRight className="ml-1.5 h-4 w-4" />
              </Link>
            </Button>
          </CardContent>
        </Card>
      ) : (
        <Card className="surface-panel-strong">
          <CardContent className="flex flex-col gap-4 p-6 lg:flex-row lg:items-center lg:justify-between">
            <div className="space-y-2">
              <div className="flex flex-wrap gap-2">
                <Badge variant={payoutState.readyToReceivePayments ? "blue" : "orange"}>{payoutState.statusLabel}</Badge>
                {!payoutState.readyToReceivePayments ? <Badge variant="outline">Draft first, publish after setup</Badge> : null}
              </div>
              <div className="flex items-start gap-3">
                {!payoutState.readyToReceivePayments ? <CircleAlert className="mt-1 h-5 w-5 text-uva-orange" /> : null}
                <div className="space-y-1">
                  <p className="font-semibold text-foreground">{payoutState.headline}</p>
                  <p className="max-w-2xl text-sm leading-7 text-muted-foreground">
                    {payoutState.readyToReceivePayments
                      ? "You can publish normally now. HoosFinds will route checkout earnings to your connected payout account."
                      : "You can draft your listing below, but before it goes live, connect where you want payouts sent."}
                  </p>
                  {!payoutState.readyToReceivePayments &&
                  payoutState.ctaTarget === "stripe" &&
                  payoutState.requirementHighlights.length > 0 ? (
                    <p className="max-w-2xl text-sm leading-7 text-muted-foreground">
                      Stripe still needs {payoutState.requirementHighlights.join(", ")} before this listing can go live.
                    </p>
                  ) : null}
                </div>
              </div>
            </div>
            {!payoutState.readyToReceivePayments ? (
              payoutState.ctaTarget === "stripe" ? (
                <PayoutSetupButton
                  viewerSignedIn
                  payoutsConfigured={payoutsConfigured}
                  payoutState={payoutState}
                  callbackPath="/sell"
                />
              ) : (
                <Button asChild>
                  <Link href="/payments">{payoutState.ctaLabel}</Link>
                </Button>
              )
            ) : null}
          </CardContent>
        </Card>
      )}

      {session?.user.id ? (
        <SellWizard
          payoutsReady={payoutState.readyToReceivePayments}
          payoutsConfigured={payoutsConfigured}
          viewerSignedIn
          payoutSetupHref="/payments"
          payoutSetupLabel={payoutState.ctaLabel}
          payoutSetupDetail={payoutState.detail}
          payoutState={payoutState}
        />
      ) : null}
    </div>
  );
}
