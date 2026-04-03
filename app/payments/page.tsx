import Link from "next/link";
import { ArrowRight, BadgeCheck, CircleAlert, Clock3 } from "lucide-react";

import { PayoutActions } from "@/components/payments/payout-actions";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { getAuthSession } from "@/lib/auth";
import { getPublicProfileUrl } from "@/lib/connect-onboarding";
import { getSellerPayoutDashboardData, type SellerPayoutStatus } from "@/lib/seller-payouts";
import { isStripeConnectConfigured } from "@/lib/stripe";
import { formatCurrency, timeAgo } from "@/lib/utils";

type PaymentsPageProps = {
  searchParams?: {
    accountId?: string;
    refresh?: string;
  };
};

function getSaleStatusLabel(status: "PENDING_CONFIRMATION" | "ISSUE_REPORTED" | "COMPLETED" | "CANCELLED" | null) {
  if (status === "COMPLETED") return "Completed";
  if (status === "ISSUE_REPORTED") return "Issue reported";
  if (status === "PENDING_CONFIRMATION") return "Awaiting pickup";
  if (status === "CANCELLED") return "Canceled";
  return "Paid";
}

function getStatusBadgeVariant(status: SellerPayoutStatus) {
  if (status === "ready") return "blue";
  if (status === "under_review") return "outline";
  return "orange";
}

export default async function PaymentsPage({ searchParams }: PaymentsPageProps) {
  const session = await getAuthSession();
  const dashboard = await getSellerPayoutDashboardData(session?.user.id);
  const payoutsConfigured = isStripeConnectConfigured();
  const returnedFromStripe = Boolean(searchParams?.accountId);
  const refreshRequested = searchParams?.refresh === "1";
  const profileUrl = getPublicProfileUrl(session?.user.username);

  return (
    <div className="container space-y-10 py-8 md:space-y-12 md:py-10">
      <section className="grid gap-8 border-b border-border/80 pb-8 lg:grid-cols-[1.08fr_0.92fr] lg:items-end">
        <div className="space-y-5">
          <div className="flex flex-wrap gap-2">
            <Badge variant="outline">Payout center</Badge>
            <Badge variant="blue">Listings only</Badge>
            <Badge variant={getStatusBadgeVariant(dashboard.payoutState.status)}>
              {dashboard.payoutState.statusLabel}
            </Badge>
          </div>
          <div className="space-y-3">
            <p className="editorial-eyebrow">Seller setup</p>
            <h1 className="max-w-4xl font-display text-4xl font-extrabold tracking-[-0.04em] md:text-6xl md:leading-[0.95]">
              Connect payouts once, then sell through HoosFinds.
            </h1>
            <p className="max-w-2xl text-sm leading-7 text-muted-foreground md:text-base">
              Your HoosFinds listings stay the only inventory buyers see. Stripe runs underneath this page so we can send
              your earnings after a sale without making selling feel like a separate dashboard.
            </p>
          </div>
          <div className="space-y-3">
            <div className="flex flex-wrap gap-3">
              <PayoutActions
                viewerSignedIn={Boolean(session?.user.id)}
                payoutsConfigured={payoutsConfigured}
                payoutState={dashboard.payoutState}
              />
              {session?.user.sellerKind === "VERIFIED_SHOP" && session.user.verifiedShopApprovedAt ? (
                <Button asChild variant="secondary">
                  <Link href="/verified-seller/portal">Open Verified Shop portal</Link>
                </Button>
              ) : null}
              <Button asChild variant="secondary">
                <Link href="/market">
                  Browse live listings
                  <ArrowRight className="ml-1.5 h-4 w-4" />
                </Link>
              </Button>
            </div>
            {!dashboard.payoutState.readyToReceivePayments &&
            dashboard.payoutState.ctaTarget === "stripe" &&
            session?.user.id ? (
              <p className="max-w-2xl text-xs leading-6 text-muted-foreground">
                If Stripe asks for a website, use{" "}
                {profileUrl ? (
                  <Link href={`/u/${session.user.username}`} className="font-medium text-foreground transition hover:text-uva-orange">
                    {profileUrl.replace(/^https?:\/\//, "")}
                  </Link>
                ) : (
                  <span className="font-medium text-foreground">your HoosFinds profile URL</span>
                )}{" "}
                or a public social/profile link you already use to sell.
              </p>
            ) : null}
          </div>
        </div>

        <Card className="surface-panel-strong">
          <CardContent className="space-y-5 p-6">
            <div className="flex items-start gap-3">
              <div className="mt-1 flex h-11 w-11 items-center justify-center rounded-full bg-uva-orange/10 text-uva-orange">
                {dashboard.payoutState.readyToReceivePayments ? (
                  <BadgeCheck className="h-5 w-5" />
                ) : dashboard.payoutState.status === "under_review" ? (
                  <Clock3 className="h-5 w-5" />
                ) : (
                  <CircleAlert className="h-5 w-5" />
                )}
              </div>
              <div className="space-y-1">
                <p className="editorial-eyebrow">Status</p>
                <h2 className="font-display text-2xl font-extrabold tracking-tight">{dashboard.payoutState.headline}</h2>
                <p className="text-sm leading-7 text-muted-foreground">{dashboard.payoutState.detail}</p>
                {!dashboard.payoutState.readyToReceivePayments ? (
                  <p className="text-sm font-medium text-foreground/88">
                    {dashboard.payoutState.status === "under_review"
                      ? "No action in Stripe right now. We'll unlock selling once their review clears."
                      : dashboard.payoutState.status === "unavailable"
                        ? "Next step: refresh here after Stripe payouts are available in this environment."
                      : dashboard.payoutState.status === "requires_reconnect"
                        ? "Next step: reconnect payouts so HoosFinds can send your earnings again."
                      : dashboard.payoutState.status === "not_connected"
                        ? "Next step: connect payouts so HoosFinds knows where to send your earnings."
                      : dashboard.payoutState.status === "payouts_paused"
                        ? "Next step: continue in Stripe and fix the requested details."
                      : dashboard.payoutState.status === "verification_incomplete"
                          ? "Next step: continue in Stripe and finish verification."
                          : "Next step: connect payouts to start selling."}
                  </p>
                ) : null}
                {dashboard.payoutState.requirementHighlights.length > 0 && dashboard.payoutState.ctaTarget === "stripe" ? (
                  <div className="rounded-[1.2rem] border border-border bg-background/70 px-4 py-3">
                    <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">Stripe still needs</p>
                    <ul className="mt-2 space-y-1 text-sm text-foreground/88">
                      {dashboard.payoutState.requirementHighlights.map((item) => (
                        <li key={item}>• {item}</li>
                      ))}
                    </ul>
                  </div>
                ) : null}
              </div>
            </div>

            {(returnedFromStripe || refreshRequested) && session?.user.id ? (
              <div className="rounded-[1.5rem] border border-border bg-background/70 px-4 py-3 text-sm text-muted-foreground">
                {dashboard.payoutState.readyToReceivePayments
                  ? "Welcome back. HoosFinds refreshed your payout status from Stripe and your account is ready to sell."
                  : dashboard.payoutState.status === "under_review"
                    ? "Welcome back. HoosFinds refreshed your payout status from Stripe. Stripe is still reviewing your account, so payouts stay paused for now."
                    : dashboard.payoutState.status === "requires_reconnect"
                      ? "Welcome back. HoosFinds refreshed your payout status from Stripe, but your previous Stripe connection is no longer available. Reconnect payouts to keep selling."
                    : dashboard.payoutState.status === "payouts_paused"
                      ? "Welcome back. HoosFinds refreshed your payout status from Stripe, but payouts are still paused until Stripe's requested details are fixed."
                    : "Welcome back. HoosFinds refreshed your payout status from Stripe, but Stripe still needs more information before payouts can go live."}
              </div>
            ) : null}

            {!payoutsConfigured ? (
              <div className="rounded-[1.5rem] border border-destructive/25 bg-destructive/10 px-4 py-3 text-sm text-destructive">
                Stripe payouts are not configured in this environment yet, so sellers cannot finish setup or receive routed payouts here.
              </div>
            ) : null}

            <div className="grid gap-3 sm:grid-cols-3">
              <div className="rounded-[1.4rem] border border-border bg-background/70 px-4 py-4">
                <p className="editorial-eyebrow">1</p>
                <p className="mt-2 text-sm font-semibold text-foreground">Connect payouts</p>
                <p className="mt-1 text-sm text-muted-foreground">Tell HoosFinds where your earnings should go.</p>
              </div>
              <div className="rounded-[1.4rem] border border-border bg-background/70 px-4 py-4">
                <p className="editorial-eyebrow">2</p>
                <p className="mt-2 text-sm font-semibold text-foreground">Post your listing</p>
                <p className="mt-1 text-sm text-muted-foreground">Your normal listing is the item buyers see everywhere.</p>
              </div>
              <div className="rounded-[1.4rem] border border-border bg-background/70 px-4 py-4">
                <p className="editorial-eyebrow">3</p>
                <p className="mt-2 text-sm font-semibold text-foreground">Get paid</p>
                <p className="mt-1 text-sm text-muted-foreground">HoosFinds routes the sale to your payout account after checkout, while buyer confirmation stays a handoff record inside the app.</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </section>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <Card className="surface-panel-strong">
          <CardContent className="space-y-1 p-5">
            <p className="editorial-eyebrow">Live listings</p>
            <p className="font-display text-3xl font-extrabold tracking-tight">{dashboard.stats.liveListings}</p>
            <p className="text-sm text-muted-foreground">Listings buyers can check out right now.</p>
          </CardContent>
        </Card>
        <Card className="surface-panel-strong">
          <CardContent className="space-y-1 p-5">
            <p className="editorial-eyebrow">Awaiting pickup</p>
            <p className="font-display text-3xl font-extrabold tracking-tight">{dashboard.stats.pendingHandoffs}</p>
            <p className="text-sm text-muted-foreground">Paid sales still waiting on buyer confirmation.</p>
          </CardContent>
        </Card>
        <Card className="surface-panel-strong">
          <CardContent className="space-y-1 p-5">
            <p className="editorial-eyebrow">Completed sales</p>
            <p className="font-display text-3xl font-extrabold tracking-tight">{dashboard.stats.completedSales}</p>
            <p className="text-sm text-muted-foreground">Confirmed handoffs across your HoosFinds listings.</p>
          </CardContent>
        </Card>
        <Card className="surface-panel-strong">
          <CardContent className="space-y-1 p-5">
            <p className="editorial-eyebrow">Gross sales</p>
            <p className="font-display text-3xl font-extrabold tracking-tight">
              {formatCurrency(dashboard.stats.grossSalesCents / 100)}
            </p>
            <p className="text-sm text-muted-foreground">Total paid through listing checkout.</p>
          </CardContent>
        </Card>
      </section>

      <section className="grid gap-6 lg:grid-cols-[1.08fr_0.92fr]">
        <Card className="surface-panel-strong">
          <CardContent className="space-y-5 p-6">
            <div className="space-y-2">
              <p className="editorial-eyebrow">Recent sales</p>
              <h2 className="font-display text-3xl font-extrabold tracking-tight">Listing payments, not a separate catalog.</h2>
              <p className="max-w-2xl text-sm leading-7 text-muted-foreground">
                Every payout on HoosFinds now maps back to a normal marketplace listing, buyer, and seller. There is no second storefront to manage.
              </p>
            </div>

            {dashboard.recentSales.length > 0 ? (
              <div className="space-y-3">
                {dashboard.recentSales.map((sale) => (
                  <div key={sale.orderId} className="flex flex-col gap-3 rounded-[1.5rem] border border-border bg-background/70 px-4 py-4 sm:flex-row sm:items-center sm:justify-between">
                    <div className="space-y-1">
                      <Link href={`/listing/${sale.listingId}`} className="font-semibold text-foreground transition hover:text-uva-orange">
                        {sale.listingTitle}
                      </Link>
                      <p className="text-sm text-muted-foreground">
                        Buyer {sale.buyer.displayName} paid {formatCurrency(sale.buyerTotalCents / 100)} · {timeAgo(sale.createdAt)} ago
                      </p>
                      <div className="grid gap-1 pt-2 text-xs text-muted-foreground sm:grid-cols-2">
                        <div className="flex items-center justify-between gap-3">
                          <span>Sale price</span>
                          <span>{formatCurrency(sale.listingPriceCents / 100)}</span>
                        </div>
                        <div className="flex items-center justify-between gap-3">
                          <span>Seller fee</span>
                          <span>-{formatCurrency(sale.sellerFeeCents / 100)}</span>
                        </div>
                        <div className="flex items-center justify-between gap-3">
                          <span>Processing fee</span>
                          <span>-{formatCurrency(sale.stripeFeeCents / 100)}</span>
                        </div>
                        <div className="flex items-center justify-between gap-3">
                          <span>Per-order fee</span>
                          <span>-{formatCurrency(sale.perOrderFeeCents / 100)}</span>
                        </div>
                        <div className="flex items-center justify-between gap-3 font-semibold text-foreground sm:col-span-2">
                          <span>You&apos;ll receive</span>
                          <span>{formatCurrency(sale.sellerPayoutCents / 100)}</span>
                        </div>
                      </div>
                    </div>
                    <Badge variant={sale.handoffStatus === "COMPLETED" ? "blue" : "outline"}>
                      {getSaleStatusLabel(sale.handoffStatus)}
                    </Badge>
                  </div>
                ))}
              </div>
            ) : (
              <div className="rounded-[1.6rem] border border-border bg-background/70 px-5 py-6 text-sm leading-7 text-muted-foreground">
                {session?.user.id
                  ? "No sales have come through your listings yet. Once a buyer checks out, the payment will show up here and stay tied to the listing that sold."
                  : "Sign in to view payout readiness, listing sales, and seller setup in one place."}
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="surface-panel-strong">
          <CardContent className="space-y-5 p-6">
            <div className="space-y-2">
              <p className="editorial-eyebrow">What sellers need to know</p>
              <h2 className="font-display text-3xl font-extrabold tracking-tight">Keep it simple.</h2>
            </div>
            <div className="space-y-4 text-sm leading-7 text-muted-foreground">
              <p>Use the normal HoosFinds sell flow for every item. If a listing is live here, it is the same listing buyers see in Browse, Following, profiles, and checkout.</p>
              <p>Sellers can draft locally first, but payouts must be connected before a listing can go live or receive routed checkout funds.</p>
              <p>Buyers still check out through Stripe. HoosFinds handles the payout routing underneath that listing so sellers do not need to learn Stripe product or account details.</p>
            </div>
            <div className="flex flex-wrap gap-3">
              <Button asChild>
                <Link href="/sell">Open sell flow</Link>
              </Button>
              <Button asChild variant="secondary">
                <Link href="/purchases">View purchases</Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </section>
    </div>
  );
}
