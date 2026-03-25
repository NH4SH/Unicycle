"use client";
import Link from "next/link";
import Image from "next/image";
import { motion } from "framer-motion";
import { MapPin, Pencil, Star } from "lucide-react";

import { HeartButton } from "@/components/cards/heart-button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CONDITION_LABELS } from "@/lib/constants";
import { type ListingCardData } from "@/lib/data";
import { formatCurrency, timeAgo } from "@/lib/utils";

type ListingCardProps = {
  listing: ListingCardData;
  sticker?: string;
  editHref?: string;
};

export function ListingCard({ listing, sticker, editHref }: ListingCardProps) {
  return (
    <motion.div whileHover={{ y: -4 }} transition={{ type: "spring", stiffness: 260, damping: 20 }}>
      <Card className="group overflow-hidden border-white/70 bg-white/95 transition-shadow duration-300 hover:shadow-card">
        <Link href={`/listing/${listing.id}`} className="block">
          <div className="relative aspect-[4/5] overflow-hidden">
            <Image
              src={listing.images[0] || "https://images.unsplash.com/photo-1519337265831-281ec6cc8514?auto=format&fit=crop&w=900&q=80"}
              alt={listing.title}
              fill
              className="object-cover transition duration-500 group-hover:scale-[1.04]"
              sizes="(max-width: 768px) 50vw, (max-width: 1024px) 33vw, 25vw"
            />
            {sticker ? (
              <span className="absolute left-3 top-3 rounded-full bg-white px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide shadow-soft">
                {sticker}
              </span>
            ) : null}
          </div>
        </Link>

        <div className="space-y-3 p-4">
          <div className="flex items-start justify-between gap-2">
            <div className="space-y-1">
              <Link href={`/listing/${listing.id}`} className="line-clamp-1 font-semibold tracking-tight">
                {listing.title}
              </Link>
              <p className="font-display text-xl font-bold text-uva-blue">{formatCurrency(listing.priceCents / 100)}</p>
            </div>
            <div className="flex items-center gap-1">
              <HeartButton
                listingId={listing.id}
                initialFavorited={listing.isFavorited}
                initialCount={listing.favoriteCount}
              />
              {editHref ? (
                <Button asChild size="icon" variant="ghost" aria-label="Edit listing">
                  <Link href={editHref} onClick={(e) => e.stopPropagation()}>
                    <Pencil className="h-4 w-4" />
                  </Link>
                </Button>
              ) : null}
            </div>
          </div>

          <div className="flex flex-wrap gap-1.5">
            <Badge variant="orange">{CONDITION_LABELS[listing.condition]}</Badge>
            {listing.pickupLocations.slice(0, 1).map((loc) => (
              <Badge key={loc} variant="blue">
                Meet at {loc}
              </Badge>
            ))}
          </div>

          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <div className="inline-flex items-center gap-1">
              <Star className="h-3.5 w-3.5 fill-uva-orange text-uva-orange" />
              {listing.sellerRating.toFixed(1)}
            </div>
            <div className="inline-flex items-center gap-1">
              <MapPin className="h-3.5 w-3.5" />
              {listing.pickupLocations[0]}
            </div>
            <p>{timeAgo(listing.createdAt)}</p>
          </div>
        </div>
      </Card>
    </motion.div>
  );
}
