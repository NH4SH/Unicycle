import Link from "next/link";
import { ArrowRight, CircleAlert } from "lucide-react";

import { PayoutSetupButton } from "@/components/payments/payout-setup-button";
import { SellWizard } from "@/components/sell/sell-wizard";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { getAuthSession } from "@/lib/auth";
import { getActiveUserBan } from "@/lib/moderation";
import { getSellerPayoutState } from "@/lib/seller-payouts";
import { isStripeConnectConfigured } from "@/lib/stripe";
import { canUserSell } from "@/lib/user-access";

export default async function SellPage() {
  const session = await getAuthSession();
  const payoutState = await getSellerPayoutState(session?.user.id);
  const activeBan = await getActiveUserBan(session?.user.id);
  const payoutsConfigured = isStripeConnectConfigured();
  const viewerCanSell = session?.user
    ? canUserSell({
        email: session.user.email ?? "",
        role: session.user.role,
        sellerKind: session.user.sellerKind,
        verifiedShopApprovedAt: session.user.verifiedShopApprovedAt ?? null
      })
    : false;

  return (
    <div className="container space-y-6 py-8 md:space-y-8 md:py-10">
      <div className="grid gap-4 border-b border-border/80 pb-6 md:grid-cols-[1fr_auto] md:items-end">
        <div className="space-y-2">
          <p className="editorial-eyebrow">Sell on HoosFinds</p>
          <h1 className="font-display text-4xl font-extrabold tracking-tight md:text-5xl">
            Turn the piece you&apos;re done with into someone else&apos;s next fit.
          </h1>
          <p className="max-w-2xl text-sm leading-7 text-foreground/76 dark:text-white/82 md:text-base">
            Create the listing here, keep pickup simple, and let HoosFinds handle payout routing underneath the sale.
          </p>
        </div>
        <div className="surface-pill px-4 py-2 text-xs uppercase tracking-[0.18em]">
          Pickup on Grounds
        </div>
      </div>

      {!session?.user.id ? (
        <Card className="surface-panel-strong">
          <CardContent className="flex flex-col gap-4 p-6 md:flex-row md:items-center md:justify-between">
            <div className="space-y-2">
              <p className="editorial-eyebrow">Sign in first</p>
              <h2 className="font-display text-3xl font-extrabold tracking-tight">Sign in before you post a listing.</h2>
              <p className="max-w-2xl text-sm leading-7 text-foreground/76 dark:text-white/82">
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
                  <p className="max-w-2xl text-sm leading-7 text-foreground/76 dark:text-white/82">
                    {payoutState.readyToReceivePayments
                      ? "You can publish normally now. HoosFinds will route checkout earnings to your connected payout account."
                      : payoutState.status === "requires_reconnect"
                        ? "You can draft your listing below, but before it goes live, reconnect payouts so HoosFinds knows where to send your earnings."
                        : "You can draft your listing below, but before it goes live, connect where you want payouts sent."}
                  </p>
                  {!payoutState.readyToReceivePayments &&
                  payoutState.ctaTarget === "stripe" &&
                  payoutState.requirementHighlights.length > 0 ? (
                    <p className="max-w-2xl text-sm leading-7 text-foreground/76 dark:text-white/82">
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
            ) : session.user.sellerKind === "VERIFIED_SHOP" && session.user.verifiedShopApprovedAt ? (
              <Button asChild variant="secondary">
                <Link href="/verified-seller/portal">Open Verified Shop portal</Link>
              </Button>
            ) : null}
          </CardContent>
        </Card>
      )}

      {session?.user.id && activeBan ? (
        <Card className="surface-panel-strong">
          <CardContent className="space-y-3 p-6">
            <p className="font-semibold text-foreground">Your account is temporarily blocked from new marketplace actions.</p>
            <p className="text-sm leading-7 text-foreground/76 dark:text-white/82">
              {activeBan.endsAt
                ? `This restriction lasts until ${activeBan.endsAt.toLocaleString()}.`
                : "This restriction stays in place until the HoosFinds team reviews it."}{" "}
              Reason: {activeBan.reason}
            </p>
          </CardContent>
        </Card>
      ) : session?.user.id && viewerCanSell ? (
        <SellWizard
          payoutsReady={payoutState.readyToReceivePayments}
          payoutsConfigured={payoutsConfigured}
          viewerSignedIn
          payoutSetupHref="/payments"
          payoutSetupLabel={payoutState.ctaLabel}
          payoutSetupDetail={payoutState.detail}
          payoutState={payoutState}
        />
      ) : session?.user.id ? (
        <Card className="surface-panel-strong">
          <CardContent className="space-y-3 p-6">
            <p className="font-semibold text-foreground">Selling is limited to UVA students and approved Verified Shops.</p>
            <p className="text-sm leading-7 text-foreground/76 dark:text-white/82">
              If you run a local thrift or resale business, apply as a Verified Shop and HoosFinds will review you for the marketplace.
            </p>
            <Button asChild>
              <Link href="/verified-seller/apply">Apply as a Verified Shop</Link>
            </Button>
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}
