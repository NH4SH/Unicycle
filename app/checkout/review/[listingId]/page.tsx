import Image from "next/image";
import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft, ShieldCheck, WalletCards } from "lucide-react";

import { ContinueCheckoutButton } from "@/components/checkout/continue-checkout-button";
import { UserAvatar } from "@/components/shared/user-avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { getAuthSession } from "@/lib/auth";
import { DEFAULT_SALES_TAX_BPS } from "@/lib/checkout-pricing";
import { getCheckoutReviewData } from "@/lib/listing-checkout";
import { formatCurrencyFromCents } from "@/lib/utils";

type CheckoutReviewPageProps = {
  params: {
    listingId: string;
  };
};

function getIssueCopy(issue: NonNullable<Awaited<ReturnType<typeof getCheckoutReviewData>>["issue"]>) {
  switch (issue) {
    case "own_listing":
      return {
        badge: "Own listing",
        title: "You can't buy your own listing.",
        description: "Head back to the listing if you want to edit it, message buyers, or manage the sale another way."
      };
    case "listing_inactive":
    case "already_paid":
      return {
        badge: "No longer available",
        title: "This listing can't continue to checkout.",
        description: "It has already sold or is no longer active in the marketplace."
      };
    case "checkout_in_progress":
      return {
        badge: "Checkout in progress",
        title: "Another secure checkout is already in progress.",
        description: "Give this one a few minutes. If it expires, you can come back and try again."
      };
    case "seller_payouts_reconnect_required":
      return {
        badge: "Seller setup",
        title: "This seller needs to reconnect payouts first.",
        description: "HoosFinds can't route the payment until the seller reconnects Stripe payouts."
      };
    case "seller_payouts_incomplete":
      return {
        badge: "Seller setup",
        title: "This seller is still finishing payout setup.",
        description: "HoosFinds will unlock secure checkout as soon as the seller finishes verification."
      };
    default:
      return {
        badge: "Unavailable",
        title: "This checkout isn't available right now.",
        description: "Head back to the listing and try again in a moment."
      };
  }
}

export default async function CheckoutReviewPage({ params }: CheckoutReviewPageProps) {
  const session = await getAuthSession();
  const review = await getCheckoutReviewData(params.listingId, session?.user.id);

  if (!review.listing) {
    return (
      <div className="container py-10">
        <Card className="mx-auto max-w-3xl surface-panel-strong">
          <CardContent className="space-y-5 p-8 text-center">
            <Badge variant="outline">Checkout review</Badge>
            <h1 className="font-display text-4xl font-extrabold tracking-tight">We couldn&apos;t find that listing.</h1>
            <p className="text-sm leading-7 text-muted-foreground">It may have been removed, sold, or linked from an old page.</p>
            <div className="flex justify-center gap-3">
              <Button asChild>
                <Link href="/market">Browse HoosFinds</Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  const { listing, pricing } = review;

  if (!session?.user?.id) {
    redirect(`/sign-in?callbackUrl=${encodeURIComponent(`/checkout/review/${listing.id}`)}`);
  }

  const signInUserCanBuy = session.user.canBuy;
  const isBlocked = !signInUserCanBuy || Boolean(review.issue);
  const issueCopy = review.issue ? getIssueCopy(review.issue) : null;

  return (
    <div className="container py-8 md:py-10">
      <div className="mx-auto max-w-5xl space-y-6">
        <Link
          href={`/listing/${listing.id}`}
          className="inline-flex items-center gap-2 text-sm font-medium text-muted-foreground transition hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to listing
        </Link>

        <section className="grid gap-4 sm:gap-6 lg:grid-cols-[1.05fr_0.95fr]">
          <Card className="order-2 surface-panel-strong overflow-hidden lg:order-1">
            <CardContent className="space-y-6 p-6 md:p-7">
              <div className="space-y-3">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant="outline">Checkout review</Badge>
                  <Badge variant="blue">Secure Stripe payment</Badge>
                </div>
                <div className="space-y-2">
                  <p className="editorial-eyebrow">Review before you pay</p>
                  <h1 className="font-display text-[2.35rem] font-extrabold tracking-tight leading-[0.98] md:text-5xl">
                    Make sure the total looks right before Stripe.
                  </h1>
                  <p className="max-w-2xl text-sm leading-7 text-muted-foreground md:text-base">
                    HoosFinds keeps pickup local and payment secure. There’s no shipping here, just the item, the platform fee, applicable tax, and your final total.
                  </p>
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-[180px_1fr]">
                <div className="relative aspect-[4/5] overflow-hidden rounded-[1.8rem] border border-border/80 bg-card">
                  <Image
                    src={listing.images[0] || "https://images.unsplash.com/photo-1512436991641-6745cdb1723f?auto=format&fit=crop&w=1200&q=80"}
                    alt={listing.title}
                    fill
                    className="object-cover"
                    sizes="180px"
                  />
                </div>

                <div className="space-y-4">
                  <div className="space-y-2">
                    <p className="font-display text-3xl font-extrabold tracking-tight">{listing.title}</p>
                    <div className="flex items-center gap-3">
                      <UserAvatar
                        name={listing.seller.displayName}
                        username={listing.seller.publicUsername ?? listing.seller.username}
                        imageUrl={listing.seller.profileImageUrl}
                        className="h-10 w-10"
                      />
                      <div className="min-w-0">
                        <p className="font-medium text-foreground">{listing.seller.displayName}</p>
                        {listing.seller.publicUsername ? (
                          <p className="text-xs text-muted-foreground">@{listing.seller.publicUsername}</p>
                        ) : null}
                      </div>
                    </div>
                  </div>

                  <p className="line-clamp-4 text-sm leading-7 text-muted-foreground sm:line-clamp-none">
                    {listing.description}
                  </p>
                </div>
              </div>

              {!signInUserCanBuy ? (
                <div className="rounded-[1.4rem] border border-uva-orange/20 bg-uva-orange/7 px-4 py-4 text-sm leading-6 text-foreground/88">
                  Buying on HoosFinds stays exclusive to UVA students right now.
                </div>
              ) : null}

              {issueCopy ? (
                <div className="rounded-[1.5rem] border border-border bg-background/70 px-5 py-5">
                  <div className="space-y-2">
                    <Badge variant="outline">{issueCopy.badge}</Badge>
                    <h2 className="font-display text-2xl font-extrabold tracking-tight">{issueCopy.title}</h2>
                    <p className="text-sm leading-7 text-muted-foreground">{issueCopy.description}</p>
                  </div>
                </div>
              ) : null}

              <div className="rounded-[1.5rem] border border-border bg-background/70 px-5 py-4">
                <div className="flex items-start gap-3 text-sm leading-6 text-muted-foreground">
                  <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-uva-orange" />
                  <p>By continuing, you’ll be redirected to Stripe for secure payment.</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="order-1 surface-panel-strong lg:order-2">
            <CardContent className="space-y-6 p-6 md:p-7">
              <div className="space-y-2">
                <p className="editorial-eyebrow">Order summary</p>
                <h2 className="font-display text-3xl font-extrabold tracking-tight">Your total</h2>
              </div>

              <div className="space-y-4 rounded-[1.6rem] border border-border bg-background/70 px-5 py-5">
                <div className="flex items-center justify-between gap-4 text-sm">
                  <span className="text-muted-foreground">Item price</span>
                  <span className="font-semibold text-foreground">
                    {formatCurrencyFromCents(pricing!.listingPriceCents, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </span>
                </div>
                <div className="flex items-center justify-between gap-4 text-sm">
                  <span className="text-muted-foreground">HoosFinds fee</span>
                  <span className="font-semibold text-foreground">
                    {formatCurrencyFromCents(pricing!.buyerFeeTotalCents, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </span>
                </div>
                <div className="flex items-center justify-between gap-4 text-sm">
                  <span className="text-muted-foreground">Sales tax</span>
                  <span className="font-semibold text-foreground">
                    {formatCurrencyFromCents(pricing!.taxAmountCents, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </span>
                </div>
                <div className="border-t border-border/80 pt-4">
                  <div className="flex items-center justify-between gap-4">
                    <span className="font-display text-2xl font-extrabold tracking-tight">Total</span>
                    <span className="font-display text-3xl font-extrabold tracking-tight text-uva-blue dark:text-white">
                      {formatCurrencyFromCents(pricing!.buyerTotalCents, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </span>
                  </div>
                </div>
              </div>

              {isBlocked ? (
                <Button asChild size="lg" className="w-full">
                  <Link href={`/listing/${listing.id}`}>Return to listing</Link>
                </Button>
              ) : (
                <ContinueCheckoutButton listingId={listing.id} />
              )}

              <p className="text-xs leading-6 text-muted-foreground">
                Sales tax is shown separately so HoosFinds can keep tax logic configurable. The current review flow uses a {(
                  DEFAULT_SALES_TAX_BPS / 100
                ).toFixed(1)}
                % Virginia-style example rate.
              </p>

              <Button asChild variant="secondary" size="lg" className="w-full">
                <Link href={`/listing/${listing.id}`}>
                  <WalletCards className="mr-1.5 h-4 w-4" />
                  Return to listing
                </Link>
              </Button>
            </CardContent>
          </Card>
        </section>
      </div>
    </div>
  );
}
