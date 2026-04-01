"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { motion } from "framer-motion";
import { MapPin, MessageCircle, ShieldCheck, Star, Trash2, WalletCards } from "lucide-react";
import { toast } from "sonner";

import { ListingCard } from "@/components/cards/listing-card";
import { HeartButton } from "@/components/cards/heart-button";
import { LinkedPlaceText, PlaceMapLink } from "@/components/shared/linked-place-text";
import { ListingStatusBadge } from "@/components/shared/sale-status-badge";
import { UserAvatar } from "@/components/shared/user-avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ListingSaleManager } from "@/components/transactions/listing-sale-manager";
import { CATEGORY_LABELS, CONDITION_LABELS } from "@/lib/constants";
import { type ListingCardData } from "@/lib/data";
import { formatCurrency, timeAgo } from "@/lib/utils";

type ListingDetailViewProps = {
  listing: ListingCardData;
  isOwner: boolean;
  similar: ListingCardData[];
  checkoutState: {
    enabled: boolean;
    issue: "payments_unavailable" | "seller_payouts_incomplete" | null;
  };
  saleContext: {
    currentTransaction: {
      id: string;
      status: "PENDING_CONFIRMATION" | "COMPLETED" | "CANCELLED";
      agreedPriceCents: number | null;
      sellerMarkedSoldAt: string | null;
      buyerConfirmedReceivedAt: string | null;
      confirmedAt: string | null;
      conversationId: string | null;
      buyer: {
        id: string;
        name: string | null;
        profileImageUrl: string | null;
        username: string;
      };
      review: {
        stars: number;
        comment: string | null;
        createdAt: string;
        reviewer: {
          id: string;
          name: string | null;
          profileImageUrl: string | null;
          username: string;
        };
      } | null;
    } | null;
    interestedBuyers: {
      conversationId: string;
      buyer: {
        id: string;
        name: string | null;
        profileImageUrl: string | null;
        username: string;
      };
      lastMessage: string | null;
      lastMessageAt: string | null;
      transactionStatus: "PENDING_CONFIRMATION" | "COMPLETED" | "CANCELLED" | null;
    }[];
  };
};

export function ListingDetailView({ listing, isOwner, similar, checkoutState, saleContext }: ListingDetailViewProps) {
  const [activeImage, setActiveImage] = useState(0);
  const [zoomed, setZoomed] = useState(false);
  const [updating, setUpdating] = useState(false);
  const [checkingOut, setCheckingOut] = useState(false);
  const router = useRouter();
  const { status } = useSession();
  const listingIsLive = listing.status === "ACTIVE";
  const sellerDisplayName = listing.seller.name || listing.seller.username;
  const sellerTrustSummary = listing.sellerRating
    ? `${listing.sellerRating.toFixed(1)} seller rating`
    : listing.sellerCompletedSales > 0
      ? `${listing.sellerCompletedSales} confirmed sales`
      : "New seller";
  const sellerTrustDetail = listing.sellerRating
    ? `${listing.sellerReviewCount} buyer ratings${listing.sellerCompletedSales > 0 ? ` · ${listing.sellerCompletedSales} confirmed sales` : ""}`
    : listing.sellerCompletedSales > 0
      ? "Buyer reviews unlock after confirmed handoffs."
      : "Buyer trust builds after the first confirmed pickup.";
  const canBuyerAct = !isOwner && listingIsLive;
  const showCheckoutCta = canBuyerAct && checkoutState.enabled;

  function getCheckoutSupportCopy() {
    if (showCheckoutCta) {
      return "Check out now, or message the seller first if you need details.";
    }

    if (checkoutState.issue === "seller_payouts_incomplete") {
      return isOwner
        ? "Finish payout setup before buyers can check out and send earnings to your payout account."
        : "This seller is still finishing payout setup, so checkout is paused for now. You can still message first.";
    }

    if (checkoutState.issue === "payments_unavailable") {
      return "Checkout is temporarily unavailable, so use chat to sort out details first.";
    }

    return "Use chat to confirm sizing, wear, and pickup before you go.";
  }

  function getTrustCopy() {
    if (showCheckoutCta) {
      return "Stripe holds payment until pickup is confirmed. Meet in a public spot on Grounds.";
    }

    if (checkoutState.issue === "seller_payouts_incomplete") {
      return isOwner
        ? "Once payouts are enabled, HoosFinds can route checkout earnings to your connected payout account automatically."
        : "Meet in a public spot on Grounds and use chat until this seller finishes payout setup.";
    }

    return "Meet in a public spot on Grounds and use chat to confirm the details first.";
  }

  async function startConversation() {
    if (status !== "authenticated") {
      router.push("/sign-in");
      return;
    }

    const response = await fetch("/api/conversations", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ listingId: listing.id })
    });

    if (!response.ok) {
      toast.error("Could not open chat right now.");
      return;
    }

    const data = (await response.json()) as { id: string };
    router.push(`/messages?conversation=${data.id}`);
  }

  async function deleteListing() {
    if (!window.confirm("Delete this listing permanently?")) return;

    setUpdating(true);
    const response = await fetch(`/api/listings/${listing.id}`, {
      method: "DELETE"
    });
    setUpdating(false);

    if (!response.ok) {
      toast.error("Could not delete listing.");
      return;
    }

    toast.success("Listing removed.");
    router.push("/market");
    router.refresh();
  }

  async function reportListing() {
    const reason = window.prompt("Share a short reason for the report.");
    if (!reason) return;

    const response = await fetch("/api/reports", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ listingId: listing.id, reason })
    });

    if (!response.ok) {
      toast.error("Could not submit report.");
      return;
    }

    toast.success("Report submitted. Thanks for keeping HoosFinds safe.");
  }

  async function startCheckout() {
    if (status !== "authenticated") {
      router.push("/sign-in");
      return;
    }

    setCheckingOut(true);
    const response = await fetch("/api/checkout/session", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ listingId: listing.id })
    });

    setCheckingOut(false);

    if (!response.ok) {
      const data = (await response.json().catch(() => null)) as { message?: string } | null;
      toast.error(data?.message || "Could not start Stripe checkout.");
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
    <div className="space-y-12">
      <section className="grid gap-8 xl:grid-cols-[1.08fr_0.92fr]">
        <div className="space-y-4">
          <motion.button
            whileTap={{ scale: 0.99 }}
            onClick={() => setZoomed((prev) => !prev)}
            className="relative aspect-[4/5] w-full overflow-hidden rounded-[2.2rem] border border-border/80 bg-card shadow-card"
            aria-label="Toggle image zoom"
          >
            <Image
              src={listing.images[activeImage] || listing.images[0]}
              alt={listing.title}
              fill
              className={`object-cover transition duration-300 ${zoomed ? "scale-[1.35]" : "scale-100"}`}
              sizes="(max-width: 1280px) 100vw, 60vw"
            />
            <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/22 via-black/0 to-transparent p-5 text-left text-white">
              <p className="text-xs uppercase tracking-[0.18em] text-white/80">Tap image to zoom</p>
            </div>
          </motion.button>

          <div className="flex gap-3 overflow-x-auto pb-1">
            {listing.images.map((img, idx) => (
              <button
                key={`${img}-${idx}`}
                onClick={() => {
                  setActiveImage(idx);
                  setZoomed(false);
                }}
                className={`relative h-24 w-20 shrink-0 overflow-hidden rounded-[1.4rem] border transition ${
                  activeImage === idx ? "border-uva-orange" : "border-border"
                }`}
                aria-label={`View image ${idx + 1}`}
              >
                <Image src={img} alt={`${listing.title} ${idx + 1}`} fill className="object-cover" sizes="80px" />
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-5">
          <div className="space-y-3">
            <p className="editorial-eyebrow">Listed on Grounds</p>
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="outline">{CATEGORY_LABELS[listing.category]}</Badge>
              <Badge variant="orange">{CONDITION_LABELS[listing.condition]}</Badge>
              {listing.status !== "ACTIVE" ? <ListingStatusBadge status={listing.status} /> : null}
              <p className="text-xs text-muted-foreground sm:ml-auto">Posted {timeAgo(listing.createdAt)} ago</p>
            </div>
            <h1 className="font-display text-4xl font-extrabold tracking-tight md:text-5xl">{listing.title}</h1>
            <div className="border-b border-border/80 pb-4">
              <div className="space-y-2">
                <p className="font-display text-4xl font-extrabold text-uva-blue dark:text-white md:text-5xl">
                  {formatCurrency(listing.priceCents / 100)}
                </p>
                <div className="flex flex-wrap items-center gap-2">
                  <Badge
                    variant="blue"
                    className="text-[0.82rem] normal-case tracking-[0.01em] dark:border-white/20 dark:bg-white/[0.13] dark:text-white"
                  >
                    {listing.favoriteCount} saves
                  </Badge>
                  {listing.status === "PENDING_CONFIRMATION" ? <Badge variant="blue">Waiting on buyer receipt</Badge> : null}
                </div>
              </div>
            </div>
          </div>

          {canBuyerAct ? (
            <div className="space-y-4 border-y border-border/80 py-5">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="space-y-2">
                  <p className="editorial-eyebrow">{showCheckoutCta ? "Buy now" : "Message first"}</p>
                  <p className="max-w-xl text-sm leading-6 text-muted-foreground">{getCheckoutSupportCopy()}</p>
                </div>
                {showCheckoutCta ? (
                  <Badge
                    variant="blue"
                    className="text-[0.78rem] normal-case tracking-[0.01em] dark:border-white/20 dark:bg-white/[0.13] dark:text-white"
                  >
                    Secure checkout beta
                  </Badge>
                ) : null}
              </div>

              {showCheckoutCta ? (
                <Button className="h-12 w-full" onClick={startCheckout} disabled={checkingOut}>
                  <WalletCards className="mr-1.5 h-4 w-4" />
                  {checkingOut ? "Redirecting to Stripe..." : "Checkout with Stripe"}
                </Button>
              ) : (
                <Button className="h-12 w-full" onClick={startConversation}>
                  <MessageCircle className="mr-1.5 h-4 w-4" />
                  Message seller
                </Button>
              )}

              <div className="flex flex-wrap gap-2">
                {showCheckoutCta ? (
                  <Button variant="secondary" onClick={startConversation} className="w-full sm:w-auto">
                    <MessageCircle className="mr-1.5 h-4 w-4" />
                    Ask a question first
                  </Button>
                ) : null}
              </div>

              <div className="flex items-start gap-2 border-t border-border/70 pt-3 text-sm leading-6 text-muted-foreground">
                <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-uva-orange" />
                <p>{getTrustCopy()}</p>
              </div>
            </div>
          ) : isOwner && listingIsLive ? (
            <div className="space-y-3 border-y border-border/80 py-4 text-sm leading-7 text-muted-foreground">
              <p>
                {checkoutState.enabled
                  ? "Buyers can message first or check out with Stripe when they’re ready. Sale management stays just below once someone claims the piece."
                  : checkoutState.issue === "seller_payouts_incomplete"
                    ? "Finish payout setup before this listing can accept checkout. Buyers can still message you in the meantime."
                    : "Checkout is temporarily unavailable right now. Buyers can still message you while HoosFinds finishes payment setup."}
              </p>
              {checkoutState.issue === "seller_payouts_incomplete" ? (
                <Button asChild size="sm" className="w-full sm:w-auto">
                  <Link href="/payments">Finish setup to get paid</Link>
                </Button>
              ) : null}
            </div>
          ) : null}

          <div className="grid gap-5 md:grid-cols-[minmax(0,1.02fr)_minmax(0,0.98fr)]">
            <div className="space-y-4 md:border-r md:border-border/70 md:pr-6">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="editorial-eyebrow">Pickup on Grounds</p>
                <p className="text-xs text-muted-foreground">Fast local handoff</p>
              </div>
              <p className="text-sm leading-6 text-muted-foreground">
                Pick a spot that works for a class break, The Corner, or game day traffic.
              </p>
              <div className="flex flex-wrap gap-2">
                {listing.pickupLocations.map((loc) => (
                  <PlaceMapLink
                    key={loc}
                    place={loc}
                    className="inline-flex items-center gap-2 rounded-full border border-uva-blue/15 bg-uva-blue/[0.08] px-3.5 py-2 text-[0.9rem] font-semibold tracking-[0.01em] text-foreground/90 transition-colors hover:border-uva-blue/24 hover:bg-uva-blue/[0.12] hover:text-foreground focus-visible:rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-uva-blue/70 focus-visible:ring-offset-2 focus-visible:ring-offset-background dark:border-white/14 dark:bg-background/90 dark:text-white/96 dark:hover:border-white/24 dark:hover:bg-background dark:hover:text-white dark:focus-visible:ring-white/30"
                  >
                    <MapPin className="h-3.5 w-3.5 text-foreground/40 dark:text-white/45" />
                    <span>{loc}</span>
                  </PlaceMapLink>
                ))}
              </div>
              {listing.meetupNotes ? (
                <p className="text-xs leading-6 text-muted-foreground">
                  <LinkedPlaceText
                    text={listing.meetupNotes}
                    linkClassName="font-medium text-foreground/88 decoration-foreground/30 hover:text-foreground dark:text-white/92 dark:decoration-white/40 dark:hover:text-white"
                  />
                </p>
              ) : null}
            </div>

            <div className="space-y-4">
              <div className="flex items-start gap-3">
                <UserAvatar
                  name={listing.seller.name}
                  username={listing.seller.username}
                  imageUrl={listing.seller.profileImageUrl}
                  className="h-12 w-12"
                />
                <div className="min-w-0 flex-1 space-y-1">
                  <p className="editorial-eyebrow">Seller</p>
                  <Link href={`/u/${listing.seller.username}`} className="block font-display text-xl font-bold hover:text-uva-orange">
                    {sellerDisplayName}
                  </Link>
                  <p className="text-xs text-muted-foreground">@{listing.seller.username}</p>
                </div>
              </div>

              <div className="space-y-2 border-t border-border/70 pt-3">
                <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm">
                  <span className="inline-flex items-center gap-1 text-foreground/88 dark:text-white/88">
                    <Star className="h-3.5 w-3.5 fill-uva-orange text-uva-orange" />
                    {sellerTrustSummary}
                  </span>
                  <span className="text-muted-foreground">{sellerTrustDetail}</span>
                </div>
                <Link
                  href={`/u/${listing.seller.username}`}
                  className="inline-flex items-center gap-2 text-sm font-semibold text-foreground/88 transition hover:gap-3 hover:text-uva-orange dark:text-white/92 dark:hover:text-uva-orange"
                >
                  View closet
                </Link>
              </div>
            </div>
          </div>

          <div className="space-y-2 px-1">
            <p className="editorial-eyebrow">Details</p>
            <p className="text-sm leading-7 text-muted-foreground">
              <LinkedPlaceText text={listing.description} />
            </p>
            {!isOwner ? (
              <div className="flex flex-wrap items-center gap-3 pt-1">
                <HeartButton
                  className="h-11"
                  listingId={listing.id}
                  initialFavorited={listing.isFavorited}
                  initialCount={listing.favoriteCount}
                />
                <Button
                  variant="ghost"
                  onClick={reportListing}
                  className="h-auto px-0 py-1 text-sm font-medium text-muted-foreground hover:text-foreground"
                >
                  Report listing
                </Button>
              </div>
            ) : null}
          </div>

          {!listingIsLive ? (
            <div className="surface-subtle rounded-[1.75rem] p-4 text-sm leading-7 text-muted-foreground">
              {listing.status === "PENDING_CONFIRMATION"
                ? "This piece has already been handed off and is waiting on the selected buyer to confirm receipt."
                : listing.status === "COMPLETED"
                  ? "This transaction has been fully completed and recorded on HoosFinds."
                  : "This listing is currently cancelled and off the feed until the seller relists it."}
            </div>
          ) : null}

          {isOwner ? (
            <div className="space-y-4">
              <ListingSaleManager
                listingStatus={listing.status}
                currentTransaction={saleContext.currentTransaction}
                interestedBuyers={saleContext.interestedBuyers}
              />
              <div className="flex flex-wrap gap-2">
                <Button variant="secondary" asChild>
                  <Link href={`/listing/${listing.id}/edit`}>Edit listing</Link>
                </Button>
                <Button
                  variant="outline"
                  onClick={deleteListing}
                  disabled={updating || listing.status === "PENDING_CONFIRMATION" || listing.status === "COMPLETED"}
                >
                  <Trash2 className="mr-1.5 h-4 w-4" />
                  {listing.status === "PENDING_CONFIRMATION" || listing.status === "COMPLETED" ? "Deletion locked" : "Delete listing"}
                </Button>
              </div>
            </div>
          ) : null}

          {!isOwner && listing.status === "PENDING_CONFIRMATION" ? (
            <p className="text-xs leading-6 text-muted-foreground">
              If you’re the selected buyer, you’ll see the confirmation step in your messages or purchases once it’s your turn to close the loop.
            </p>
          ) : null}
        </div>
      </section>

      <section className="space-y-5">
        <div className="flex items-end justify-between gap-4">
          <div>
            <p className="editorial-eyebrow">Keep browsing</p>
            <h2 className="font-display text-2xl font-extrabold tracking-tight md:text-3xl">More in this lane</h2>
          </div>
          <p className="text-sm text-muted-foreground">Similar price point, same campus style energy.</p>
        </div>
        <div className="grid grid-cols-2 gap-4 md:grid-cols-3">
          {similar.map((item) => (
            <ListingCard key={item.id} listing={item} />
          ))}
        </div>
      </section>
    </div>
  );
}
