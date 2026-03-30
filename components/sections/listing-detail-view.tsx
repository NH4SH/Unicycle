"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { motion } from "framer-motion";
import { MapPin, MessageCircle, ShieldCheck, Sparkles, Star, Trash2, WalletCards } from "lucide-react";
import { toast } from "sonner";

import { ListingCard } from "@/components/cards/listing-card";
import { HeartButton } from "@/components/cards/heart-button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { CATEGORY_LABELS, CONDITION_LABELS } from "@/lib/constants";
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

    const data = (await response.json()) as { id: string };
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

    toast.success("Listing marked as sold.");
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
            className="relative aspect-[4/5] w-full overflow-hidden rounded-[2.2rem] border border-border/80 bg-white shadow-card"
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
            <div className="flex flex-wrap gap-2">
              <Badge variant="outline">{CATEGORY_LABELS[listing.category]}</Badge>
              <Badge variant="orange">{CONDITION_LABELS[listing.condition]}</Badge>
            </div>
            <h1 className="font-display text-4xl font-extrabold tracking-tight md:text-5xl">{listing.title}</h1>
            <div className="flex flex-wrap items-end justify-between gap-3 border-b border-border/80 pb-5">
              <p className="font-display text-4xl font-extrabold text-uva-blue md:text-5xl">
                {formatCurrency(listing.priceCents / 100)}
              </p>
              <p className="text-sm text-muted-foreground">Posted {timeAgo(listing.createdAt)} ago</p>
            </div>
          </div>

          <Card className="border-border/80 bg-white/84">
            <CardContent className="space-y-4 p-6">
              <div className="space-y-2">
                <p className="editorial-eyebrow">Why it stands out</p>
                <p className="text-sm leading-7 text-muted-foreground">{listing.description}</p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant="blue">{listing.favoriteCount} saves</Badge>
                <Badge variant="outline">Student-to-student only</Badge>
              </div>
            </CardContent>
          </Card>

          <div className="grid gap-4 md:grid-cols-2">
            <Card className="border-border/80 bg-white/84">
              <CardContent className="space-y-4 p-6">
                <div>
                  <p className="editorial-eyebrow">Pickup on Grounds</p>
                  <p className="mt-2 text-sm leading-6 text-muted-foreground">
                    Meet where it makes sense between classes, on The Corner, or near game day traffic.
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  {listing.pickupLocations.map((loc) => (
                    <Badge key={loc} variant="blue">
                      <MapPin className="mr-1 h-3 w-3" />
                      {loc}
                    </Badge>
                  ))}
                </div>
                {listing.meetupNotes ? <p className="text-xs leading-6 text-muted-foreground">{listing.meetupNotes}</p> : null}
              </CardContent>
            </Card>

            <Card className="border-border/80 bg-white/84">
              <CardContent className="space-y-4 p-6">
                <div className="flex items-start gap-3">
                  <Avatar className="h-12 w-12">
                    <AvatarImage src={listing.seller.image ?? undefined} alt={listing.seller.name ?? listing.seller.username} />
                    <AvatarFallback>{listing.seller.username.slice(0, 2).toUpperCase()}</AvatarFallback>
                  </Avatar>
                  <div className="min-w-0 flex-1">
                    <p className="editorial-eyebrow">Seller</p>
                    <Link href={`/u/${listing.seller.username}`} className="mt-1 block font-display text-xl font-bold hover:text-uva-blue">
                      {listing.seller.name || listing.seller.username}
                    </Link>
                    <p className="text-xs text-muted-foreground">@{listing.seller.username}</p>
                  </div>
                  <div className="text-right text-xs">
                    <p className="inline-flex items-center gap-1">
                      <Star className="h-3.5 w-3.5 fill-uva-orange text-uva-orange" />
                      {listing.sellerRating.toFixed(1)}
                    </p>
                    <p className="text-muted-foreground">Replies {listing.sellerResponse}</p>
                  </div>
                </div>
                <p className="text-sm leading-6 text-muted-foreground">
                  Fellow Hoo with a fast response rhythm and local meetup availability.
                </p>
              </CardContent>
            </Card>
          </div>

          {canCheckout ? (
            <motion.div
              whileHover={{ y: -2 }}
              transition={{ type: "spring", stiffness: 260, damping: 22 }}
              className="relative overflow-hidden rounded-[2rem] border border-uva-blue/10 bg-gradient-to-br from-white via-uva-blue/5 to-uva-orange/10 p-5 shadow-soft"
            >
              <div className="absolute right-0 top-0 h-28 w-28 rounded-full bg-uva-blue/10 blur-3xl" />
              <div className="absolute bottom-0 left-0 h-28 w-28 rounded-full bg-uva-orange/10 blur-3xl" />
              <div className="relative space-y-4">
                <div className="flex items-center justify-between gap-3">
                  <Badge variant="blue">{isOwner ? "Seller preview" : "Secure checkout beta"}</Badge>
                  <div className="inline-flex items-center gap-1 rounded-full bg-white/90 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground shadow-soft">
                    <Sparkles className="h-3.5 w-3.5 text-uva-orange" />
                    Stripe
                  </div>
                </div>
                <div className="grid gap-4 md:grid-cols-[1fr_auto] md:items-end">
                  <div className="space-y-2">
                    <p className="editorial-eyebrow">Buy now</p>
                    <p className="max-w-xl text-sm leading-7 text-muted-foreground">
                      {isOwner
                        ? "This is how checkout appears to buyers. Owners can’t pay for their own listings."
                        : "Pay through HoosFinds, then keep pickup coordination in chat with the seller."}
                    </p>
                  </div>
                  <div className="space-y-2 text-right">
                    <p className="font-display text-3xl font-extrabold text-uva-blue">{formatCurrency(listing.priceCents / 100)}</p>
                    <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Card checkout · local pickup</p>
                  </div>
                </div>
                <Button className="h-12 w-full" onClick={startCheckout} disabled={checkingOut || isOwner}>
                  <WalletCards className="mr-1.5 h-4 w-4" />
                  {isOwner ? "Unavailable on your listing" : checkingOut ? "Redirecting to Stripe..." : "Checkout with Stripe"}
                </Button>
              </div>
            </motion.div>
          ) : null}

          {isOwner ? (
            <div className="flex flex-wrap gap-2">
              <Button variant="secondary" onClick={markSold} disabled={updating}>
                Mark sold
              </Button>
              <Button variant="outline" onClick={deleteListing} disabled={updating}>
                <Trash2 className="mr-1.5 h-4 w-4" />
                Delete listing
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

          <div className="inline-flex items-center gap-2 rounded-full border border-border bg-white/80 px-4 py-2 text-xs text-muted-foreground shadow-soft">
            <ShieldCheck className="h-3.5 w-3.5 text-uva-orange" />
            Meet in public spots on Grounds for safer exchanges.
          </div>
          {canCheckout ? (
            <p className="text-xs leading-6 text-muted-foreground">
              Checkout is powered by Stripe. Payments go through HoosFinds while meetup coordination stays between buyer and seller in-app.
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
