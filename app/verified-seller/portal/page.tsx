import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowRight, ExternalLink, Store } from "lucide-react";

import { OwnerListingCard } from "@/components/profile/owner-listing-card";
import { PayoutActions } from "@/components/payments/payout-actions";
import { VerifiedShopBadge } from "@/components/shared/verified-shop-badge";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { getAuthSession } from "@/lib/auth";
import { getUserProfile } from "@/lib/data";
import { getSellerPayoutDashboardData } from "@/lib/seller-payouts";
import { isStripeConnectConfigured } from "@/lib/stripe";
import { getVerifiedSellerApplicationForUser } from "@/lib/verified-sellers";
import { formatCurrency } from "@/lib/utils";

export default async function VerifiedSellerPortalPage() {
  const session = await getAuthSession();

  if (!session?.user?.id) {
    redirect("/sign-in?callbackUrl=%2Fverified-seller%2Fportal");
  }

  if (session.user.sellerKind !== "VERIFIED_SHOP" || !session.user.verifiedShopApprovedAt) {
    redirect("/sell");
  }

  const [profile, dashboard, application] = await Promise.all([
    getUserProfile(session.user.username, session.user.id),
    getSellerPayoutDashboardData(session.user.id),
    getVerifiedSellerApplicationForUser(session.user.id)
  ]);

  if (!profile) {
    redirect("/sell");
  }

  const payoutsConfigured = isStripeConnectConfigured();

  return (
    <div className="container space-y-8 py-8 md:space-y-10 md:py-10">
      <section className="grid gap-6 border-b border-border/80 pb-8 lg:grid-cols-[1.02fr_0.98fr] lg:items-end">
        <div className="space-y-4">
          <div className="flex flex-wrap gap-2">
            <VerifiedShopBadge label="HoosFinds Verified Shop" />
            <Badge variant={dashboard.payoutState.readyToReceivePayments ? "blue" : "orange"}>
              {dashboard.payoutState.statusLabel}
            </Badge>
          </div>
          <div className="space-y-2">
            <p className="editorial-eyebrow">Verified Shop portal</p>
            <h1 className="font-display text-4xl font-extrabold tracking-tight md:text-5xl">
              Run your local shop through the same HoosFinds marketplace students already trust.
            </h1>
            <p className="max-w-2xl text-sm leading-7 text-muted-foreground md:text-base">
              Your inventory still publishes as normal HoosFinds listings. This portal just gives verified partners a cleaner business view of listings, payouts, and sales.
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <Button asChild>
              <Link href="/sell">
                Create listing
                <ArrowRight className="ml-1.5 h-4 w-4" />
              </Link>
            </Button>
            <Button asChild variant="secondary">
              <Link href="/payments">Open payout center</Link>
            </Button>
            <Button asChild variant="secondary">
              <Link href={`/u/${session.user.username}`}>
                View public profile
                <ExternalLink className="ml-1.5 h-4 w-4" />
              </Link>
            </Button>
          </div>
        </div>

        <Card className="surface-panel-strong">
          <CardContent className="space-y-4 p-6">
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-uva-blue/[0.08] text-uva-blue dark:bg-white/[0.08] dark:text-white">
                <Store className="h-5 w-5" />
              </div>
              <div>
                <p className="font-display text-2xl font-extrabold tracking-tight">{profile.user.verifiedShopName || profile.user.name}</p>
                <p className="text-sm text-muted-foreground">
                  {profile.user.verifiedShopLocation || application?.location || "Charlottesville"}
                </p>
              </div>
            </div>

            <div className="space-y-3 text-sm leading-7 text-muted-foreground">
              <p>{profile.user.bio || application?.description || "A reviewed local resale partner on HoosFinds."}</p>
              <div className="grid gap-2 sm:grid-cols-2">
                <div className="rounded-[1.25rem] border border-border bg-background/70 px-4 py-3">
                  <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">Instagram</p>
                  <p className="mt-1 font-medium text-foreground">{profile.user.verifiedShopInstagram || application?.instagram || "Not set"}</p>
                </div>
                <div className="rounded-[1.25rem] border border-border bg-background/70 px-4 py-3">
                  <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">Website</p>
                  <p className="mt-1 font-medium text-foreground">{profile.user.verifiedShopWebsite || application?.website || "Not set"}</p>
                </div>
              </div>
            </div>

            <PayoutActions
              viewerSignedIn
              payoutsConfigured={payoutsConfigured}
              payoutState={dashboard.payoutState}
            />
          </CardContent>
        </Card>
      </section>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <Card className="surface-panel-strong">
          <CardContent className="space-y-1 p-5">
            <p className="editorial-eyebrow">Live listings</p>
            <p className="font-display text-3xl font-extrabold tracking-tight">{dashboard.stats.liveListings}</p>
            <p className="text-sm text-muted-foreground">Inventory currently visible across HoosFinds.</p>
          </CardContent>
        </Card>
        <Card className="surface-panel-strong">
          <CardContent className="space-y-1 p-5">
            <p className="editorial-eyebrow">Awaiting pickup</p>
            <p className="font-display text-3xl font-extrabold tracking-tight">{dashboard.stats.pendingHandoffs}</p>
            <p className="text-sm text-muted-foreground">Paid orders still waiting on confirmation.</p>
          </CardContent>
        </Card>
        <Card className="surface-panel-strong">
          <CardContent className="space-y-1 p-5">
            <p className="editorial-eyebrow">Completed sales</p>
            <p className="font-display text-3xl font-extrabold tracking-tight">{dashboard.stats.completedSales}</p>
            <p className="text-sm text-muted-foreground">Confirmed HoosFinds handoffs tied to your listings.</p>
          </CardContent>
        </Card>
        <Card className="surface-panel-strong">
          <CardContent className="space-y-1 p-5">
            <p className="editorial-eyebrow">Gross sales</p>
            <p className="font-display text-3xl font-extrabold tracking-tight">
              {formatCurrency(dashboard.stats.grossSalesCents / 100)}
            </p>
            <p className="text-sm text-muted-foreground">Checkout volume from the shared marketplace.</p>
          </CardContent>
        </Card>
      </section>

      <section className="grid gap-6 lg:grid-cols-[1.08fr_0.92fr]">
        <Card className="surface-panel-strong">
          <CardContent className="space-y-5 p-6">
            <div className="space-y-2">
              <p className="editorial-eyebrow">Inventory</p>
              <h2 className="font-display text-3xl font-extrabold tracking-tight">Live shop listings</h2>
              <p className="text-sm leading-7 text-muted-foreground">
                These are the same listings students see in Browse, search, and profile pages.
              </p>
            </div>
            {profile.activeListings.length ? (
              <div className="grid grid-cols-2 gap-4 md:grid-cols-3">
                {profile.activeListings.map((listing) => (
                  <OwnerListingCard key={listing.id} listing={listing} />
                ))}
              </div>
            ) : (
              <div className="rounded-[1.5rem] border border-border bg-background/70 px-5 py-6 text-sm leading-7 text-muted-foreground">
                No live listings yet. Once payouts are ready, new inventory you publish from the normal sell flow will land here and across the marketplace.
              </div>
            )}
          </CardContent>
        </Card>

        <div className="space-y-6">
          <Card className="surface-panel-strong">
            <CardContent className="space-y-4 p-6">
              <div className="space-y-2">
                <p className="editorial-eyebrow">Recent sales</p>
                <h2 className="font-display text-3xl font-extrabold tracking-tight">Latest checkouts</h2>
              </div>
              {dashboard.recentSales.length ? (
                <div className="space-y-3">
                  {dashboard.recentSales.map((sale) => (
                    <div key={sale.orderId} className="rounded-[1.35rem] border border-border bg-background/70 px-4 py-4">
                      <Link href={`/listing/${sale.listingId}`} className="font-semibold text-foreground transition hover:text-uva-orange">
                        {sale.listingTitle}
                      </Link>
                      <p className="mt-1 text-sm leading-6 text-muted-foreground">
                        {sale.buyer.displayName} paid {formatCurrency(sale.amountCents / 100)}
                      </p>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm leading-7 text-muted-foreground">Once a HoosFinds buyer checks out one of your listings, the sale will appear here.</p>
              )}
            </CardContent>
          </Card>

          <Card className="surface-panel-strong">
            <CardContent className="space-y-3 p-6">
              <p className="editorial-eyebrow">Verified identity</p>
              <div className="flex flex-wrap gap-2">
                <VerifiedShopBadge />
                <Badge variant="outline">UVA-only buyers</Badge>
                <Badge variant="outline">Listing-backed checkout</Badge>
              </div>
              <p className="text-sm leading-7 text-muted-foreground">
                Verified Shops still use the normal HoosFinds listing and payout system. The badge simply shows buyers that this local shop was reviewed by HoosFinds.
              </p>
            </CardContent>
          </Card>
        </div>
      </section>
    </div>
  );
}
