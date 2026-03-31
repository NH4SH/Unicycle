"use client";

import Image from "next/image";
import Link from "next/link";
import { motion } from "framer-motion";
import { MapPin, Star } from "lucide-react";

import { HeartButton } from "@/components/cards/heart-button";
import { ListingStatusBadge } from "@/components/shared/sale-status-badge";
import { UserAvatar } from "@/components/shared/user-avatar";
import { Badge } from "@/components/ui/badge";
import { CATEGORY_LABELS, CONDITION_LABELS } from "@/lib/constants";
import { type ListingCardData } from "@/lib/data";
import { formatCurrency, timeAgo } from "@/lib/utils";

type ListingCardProps = {
  listing: ListingCardData;
  sticker?: string;
};

export function ListingCard({ listing, sticker }: ListingCardProps) {
  return (
    <motion.article whileHover={{ y: -5 }} transition={{ type: "spring", stiffness: 250, damping: 24 }} className="group">
      <div className="relative space-y-3">
        <div className="absolute right-3 top-3 z-10">
          <HeartButton
            className="border-transparent bg-card/90 shadow-soft backdrop-blur-sm"
            listingId={listing.id}
            initialFavorited={listing.isFavorited}
            initialCount={listing.favoriteCount}
          />
        </div>

        <Link href={`/listing/${listing.id}`} className="block">
          <div className="relative aspect-[4/5] overflow-hidden rounded-[1.95rem] border border-border/75 bg-card shadow-soft">
            <Image
              src={
                listing.images[0] ||
                "https://images.unsplash.com/photo-1519337265831-281ec6cc8514?auto=format&fit=crop&w=900&q=80"
              }
              alt={listing.title}
              fill
              className="object-cover transition duration-700 group-hover:scale-[1.045]"
              sizes="(max-width: 768px) 50vw, (max-width: 1280px) 33vw, 25vw"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/18 via-black/0 to-transparent" />
            {sticker ? (
              <div className="absolute left-3 top-3">
                <Badge variant="outline" className="border-border/70 bg-card/90 backdrop-blur-sm">
                  {sticker}
                </Badge>
              </div>
            ) : null}
            {listing.status !== "ACTIVE" ? (
              <div className="absolute left-3 top-14">
                <ListingStatusBadge status={listing.status} className="border-border/70 bg-card/92 backdrop-blur-sm" />
              </div>
            ) : null}
            <div className="absolute inset-x-0 bottom-0 flex items-end justify-between gap-3 p-3">
              <Badge variant="outline" className="border-border/70 bg-card/90 backdrop-blur-sm">
                {listing.pickupLocations[0] ? `Meet at ${listing.pickupLocations[0]}` : CATEGORY_LABELS[listing.category]}
              </Badge>
              <div className="rounded-full bg-card/92 px-3.5 py-1.5 text-sm font-semibold text-foreground shadow-soft">
                {formatCurrency(listing.priceCents / 100)}
              </div>
            </div>
          </div>
        </Link>

        <div className="space-y-2 px-1">
          <div className="space-y-1">
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
              {CATEGORY_LABELS[listing.category]}
            </p>
            <div className="flex items-start justify-between gap-3">
              <Link href={`/listing/${listing.id}`} className="line-clamp-2 font-display text-[1.05rem] font-bold leading-tight tracking-tight">
                {listing.title}
              </Link>
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            <Badge variant="orange">{CONDITION_LABELS[listing.condition]}</Badge>
            <Badge variant="blue">Replies {listing.sellerResponse}</Badge>
          </div>

          <div className="flex items-center justify-between gap-3 text-xs text-muted-foreground">
            <div className="inline-flex min-w-0 items-center gap-2">
              <UserAvatar
                name={listing.seller.name}
                username={listing.seller.username}
                imageUrl={listing.seller.profileImageUrl}
                className="h-7 w-7 shrink-0"
              />
              <div className="min-w-0">
                <p className="truncate font-medium text-foreground">@{listing.seller.username}</p>
                <div className="inline-flex items-center gap-1">
                  <Star className="h-3.5 w-3.5 fill-uva-orange text-uva-orange" />
                  {listing.sellerRating ? `${listing.sellerRating.toFixed(1)} · ${listing.sellerReviewCount}` : "New seller"}
                </div>
              </div>
            </div>
            <div className="inline-flex items-center gap-1">
              <MapPin className="h-3.5 w-3.5" />
              {listing.pickupLocations[0] || "Grounds"}
            </div>
            <p>{timeAgo(listing.createdAt)}</p>
          </div>
        </div>
      </div>
    </motion.article>
  );
}
