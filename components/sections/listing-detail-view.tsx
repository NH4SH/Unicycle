"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { motion } from "framer-motion";
import { MapPin, MessageCircle, Pencil, ShieldCheck, Sparkles, Star, Trash2, WalletCards } from "lucide-react";
import { toast } from "sonner";

import { ListingCard } from "@/components/cards/listing-card";
import { HeartButton } from "@/components/cards/heart-button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { CONDITION_LABELS } from "@/lib/constants";
import { type ListingCardData } from "@/lib/data";
import { formatCurrency, timeAgo } from "@/lib/utils";

type ListingDetailViewProps = {
  listing: ListingCardData;
  isOwner: boolean;
  similar: ListingCardData[];
  canCheckout: boolean;
};

export function ListingDetailView({ listing, isOwner, similar, canCheckout }: ListingDetailViewProps) {
  const [activeImage, setActiveImage] = useState(0);
  const [zoomed, setZoomed] = useState(false);
  const [updating, setUpdating] = useState(false);
  const [checkingOut, setCheckingOut] = useState(false);
  const router = useRouter();
  const { status } = useSession();

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

    const data = await response.json();
    router.push(`/messages?conversation=${data.id}`);
  }

  async function markSold() {
    setUpdating(true);
    const response = await fetch(`/api/listings/${listing.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "SOLD" })
    });

    setUpdating(false);
    if (!response.ok) {
      toast.error("Could not update listing status.");
      return;
    }

    toast.success("Marked as sold.");
    router.refresh();
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

    toast.success("Report submitted. Thanks for keeping UniCycle safe.");
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
    <div className="space-y-10">
      <section className="grid gap-6 lg:grid-cols-[1.15fr_0.85fr]">
        <div className="space-y-3">
          <motion.button
            whileTap={{ scale: 0.98 }}
            onClick={() => setZoomed((prev) => !prev)}
            className="relative aspect-square w-full overflow-hidden rounded-3xl border border-border bg-white"
            aria-label="Toggle image zoom"
          >
            <Image
              src={listing.images[activeImage] || listing.images[0]}
              alt={listing.title}
              fill
              className={`object-cover transition duration-300 ${zoomed ? "scale-[1.45]" : "scale-100"}`}
              sizes="(max-width: 1024px) 100vw, 60vw"
            />
          </motion.button>
          <div className="flex gap-2 overflow-x-auto pb-1">
            {listing.images.map((img, idx) => (
              <button
                key={`${img}-${idx}`}
                onClick={() => {
                  setActiveImage(idx);
                  setZoomed(false);
                }}
                className={`relative h-20 w-20 shrink-0 overflow-hidden rounded-2xl border ${
                  activeImage === idx ? "border-electric" : "border-border"
                }`}
                aria-label={`View image ${idx + 1}`}
              >
                <Image src={img} alt={`${listing.title} ${idx + 1}`} fill className="object-cover" sizes="80px" />
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-4">
          <div className="space-y-2">
            <Badge variant="orange">{CONDITION_LABELS[listing.condition]}</Badge>
            <h1 className="font-display text-4xl font-black tracking-tight">{listing.title}</h1>
            <p className="font-display text-4xl font-black text-uva-blue">{formatCurrency(listing.priceCents / 100)}</p>
            <p className="text-sm text-muted-foreground">Posted {timeAgo(listing.createdAt)} ago</p>
          </div>

          <Card className="border-white bg-white/95">
            <CardContent className="space-y-4 p-5">
              <p className="text-sm leading-relaxed text-muted-foreground">{listing.description}</p>
              <div className="space-y-2">
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">Pickup options</p>
                <div className="flex flex-wrap gap-2">
                  {listing.pickupLocations.map((loc) => (
                    <Badge key={loc} variant="blue">
                      <MapPin className="mr-1 h-3 w-3" />
                      {loc}
                    </Badge>
                  ))}
                </div>
                {listing.meetupNotes ? <p className="text-xs text-muted-foreground">{listing.meetupNotes}</p> : null}
              </div>
            </CardContent>
          </Card>

          <Card className="border-white bg-white">
            <CardContent className="space-y-4 p-5">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">Seller</p>
              <div className="flex items-center gap-3">
                <Avatar className="h-11 w-11">
                  <AvatarImage src={listing.seller.image ?? undefined} alt={listing.seller.name ?? listing.seller.username} />
                  <AvatarFallback>{listing.seller.username.slice(0, 2).toUpperCase()}</AvatarFallback>
                </Avatar>
                <div>
                  <Link href={`/u/${listing.seller.username}`} className="font-semibold hover:text-electric">
                    {listing.seller.name || listing.seller.username}
                  </Link>
                  <p className="text-xs text-muted-foreground">@{listing.seller.username}</p>
                </div>
                <div className="ml-auto text-right text-xs">
                  <p className="inline-flex items-center gap-1">
                    <Star className="h-3.5 w-3.5 fill-uva-orange text-uva-orange" />
                    {listing.sellerRating.toFixed(1)}
                  </p>
                  <p className="text-muted-foreground">Replies {listing.sellerResponse}</p>
                </div>
              </div>

              <div className="space-y-3">
                {canCheckout ? (
                  <motion.div
                    whileHover={{ y: -2 }}
                    transition={{ type: "spring", stiffness: 260, damping: 22 }}
                    className="relative overflow-hidden rounded-[1.75rem] border border-electric/20 bg-gradient-to-br from-white via-electric/5 to-uva-orange/10 p-4"
                  >
                    <div className="absolute right-0 top-0 h-24 w-24 rounded-full bg-electric/15 blur-3xl" />
                    <div className="absolute bottom-0 left-0 h-24 w-24 rounded-full bg-uva-orange/15 blur-3xl" />
                    <div className="relative space-y-4">
                      <div className="flex items-center justify-between gap-3">
                        <Badge variant="blue">{isOwner ? "Seller preview" : "Secure checkout beta"}</Badge>
                        <div className="inline-flex items-center gap-1 rounded-full bg-white/90 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground shadow-soft">
                          <Sparkles className="h-3.5 w-3.5 text-uva-orange" />
                          Stripe
                        </div>
                      </div>
                      <div className="space-y-2">
                        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">Buy now</p>
                        <div className="flex items-end justify-between gap-3">
                          <div>
                            <p className="font-display text-3xl font-black text-uva-blue">
                              {formatCurrency(listing.priceCents / 100)}
                            </p>
                            <p className="max-w-xs text-sm text-muted-foreground">
                              {isOwner
                                ? "This is how checkout appears to buyers. Owners can’t pay for their own listings."
                                : "Pay on UniCycle, then keep meetup coordination in chat with the seller."}
                            </p>
                          </div>
                          <div className="flex flex-col gap-2 text-right text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                            <span className="rounded-full bg-white/90 px-3 py-1 shadow-soft">Card checkout</span>
                            <span className="rounded-full bg-white/90 px-3 py-1 shadow-soft">Pickup stays local</span>
                          </div>
                        </div>
                      </div>
                      <Button className="h-12 w-full" onClick={startCheckout} disabled={checkingOut || isOwner}>
                        <WalletCards className="mr-1.5 h-4 w-4" />
                        {isOwner
                          ? "Unavailable on your listing"
                          : checkingOut
                            ? "Redirecting to Stripe..."
                            : "Checkout with Stripe"}
                      </Button>
                    </div>
                  </motion.div>
                ) : null}
                {isOwner ? (
                  <div className="flex flex-wrap gap-2">
                    <Button
                      variant="ghost"
                      onClick={() => router.push(`/listing/${listing.id}/edit`)}
                      disabled={updating}
                    >
                      <Pencil className="mr-1.5 h-4 w-4" />
                      Edit
                    </Button>
                    <Button variant="secondary" onClick={markSold} disabled={updating}>
                      Mark Sold
                    </Button>
                    <Button variant="outline" onClick={deleteListing} disabled={updating}>
                      <Trash2 className="mr-1.5 h-4 w-4" />
                      Delete
                    </Button>
                  </div>
                ) : (
                  <div className="flex flex-wrap gap-2">
                    <Button onClick={startConversation}>
                      <MessageCircle className="mr-1.5 h-4 w-4" />
                      Message seller
                    </Button>
                    <HeartButton
                      className="h-11"
                      listingId={listing.id}
                      initialFavorited={listing.isFavorited}
                      initialCount={listing.favoriteCount}
                    />
                    <Button variant="ghost" onClick={reportListing}>
                      Report
                    </Button>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          <div className="inline-flex items-center gap-2 rounded-full border border-border bg-white px-3 py-2 text-xs text-muted-foreground">
            <ShieldCheck className="h-3.5 w-3.5 text-electric" />
            Meet in public spots on Grounds for safer exchanges.
          </div>
          {canCheckout ? (
            <p className="text-xs text-muted-foreground">
              Checkout is powered by Stripe. Payments go through UniCycle’s platform account while meetup coordination stays in-app.
            </p>
          ) : null}
        </div>
      </section>

      <section className="space-y-4">
        <h2 className="font-display text-2xl font-bold">Similar items</h2>
        <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
          {similar.map((item) => (
            <ListingCard key={item.id} listing={item} />
          ))}
        </div>
      </section>
    </div>
  );
}
