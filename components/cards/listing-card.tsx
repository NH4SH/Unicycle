"use client";

import Image from "next/image";
import Link from "next/link";
import { motion } from "framer-motion";
import { MapPin, Star } from "lucide-react";

import { HeartButton } from "@/components/cards/heart-button";
import { ListingStatusBadge } from "@/components/shared/sale-status-badge";
import { UserAvatar } from "@/components/shared/user-avatar";
import { VerifiedShopBadge } from "@/components/shared/verified-shop-badge";
import { Badge } from "@/components/ui/badge";
import { getPickupLocationShortLabel } from "@/lib/campus-pickup-locations";
import { CATEGORY_LABELS } from "@/lib/constants";
import { type ListingCardData } from "@/lib/data";
import { cn, formatCurrency, timeAgo } from "@/lib/utils";

type ListingCardProps = {
  listing: ListingCardData;
  sticker?: string;
  layout?: "default" | "featured" | "lead";
  className?: string;
};

export function ListingCard({ listing, sticker, layout = "default", className }: ListingCardProps) {
  const primaryPickup = getPickupLocationShortLabel(listing.pickupLocations[0] || "Grounds");
  const postedLabel = timeAgo(listing.createdAt);
  const sellerTrustLabel = listing.sellerRating
    ? `${listing.sellerRating.toFixed(1)} (${listing.sellerReviewCount})`
    : "New seller";
  const sellerDisplayName = listing.seller.displayName;
  const publicUsername = listing.seller.publicUsername;
  const isVerifiedShop = listing.seller.sellerKind === "VERIFIED_SHOP" && Boolean(listing.seller.verifiedShopApprovedAt);
  const isLead = layout === "lead";
  const isFeatured = layout === "featured";
  const hasElevatedTreatment = isLead || isFeatured;
  const browseCategoryLabel = listing.categoryLabel ?? CATEGORY_LABELS[listing.category];
  const metaLabel = isLead
    ? browseCategoryLabel
    : isFeatured
      ? browseCategoryLabel
      : null;
  const imageSizes = isLead
    ? "(max-width: 768px) 100vw, (max-width: 1280px) 66vw, 50vw"
    : layout === "featured"
      ? "(max-width: 768px) 100vw, (max-width: 1280px) 50vw, 33vw"
    : "(max-width: 768px) 50vw, (max-width: 1280px) 33vw, 25vw";

  return (
    <motion.article
      whileHover={{ y: -5 }}
      transition={{ type: "spring", stiffness: 250, damping: 24 }}
      className={cn("group", className)}
    >
      <div className={cn("relative space-y-3", hasElevatedTreatment && "space-y-3.5")}>
        <div className="absolute right-3 top-3 z-10">
          <HeartButton
            className="border-white/16 bg-black/42 text-white backdrop-blur-md shadow-[0_12px_28px_rgba(0,0,0,0.28)] hover:border-white/24 hover:bg-black/52 hover:text-white dark:border-white/18 dark:bg-black/48 dark:text-white"
            listingId={listing.id}
            initialFavorited={listing.isFavorited}
            initialCount={listing.favoriteCount}
          />
        </div>

        <Link href={`/listing/${listing.id}`} className="block">
          <div
            className={cn(
              "relative overflow-hidden rounded-[1.95rem] border border-border/75 bg-card shadow-soft",
              isLead
                ? "aspect-[16/11] sm:aspect-[16/13] md:aspect-[16/12] xl:aspect-[16/11]"
                : layout === "featured"
                  ? "aspect-[5/4.5] md:aspect-[6/5.2] xl:aspect-[6/5]"
                  : "aspect-[4/5]"
            )}
          >
            <Image
              src={
                listing.images[0] ||
                "https://images.unsplash.com/photo-1519337265831-281ec6cc8514?auto=format&fit=crop&w=900&q=80"
              }
              alt={listing.title}
              fill
              className="object-cover transition duration-700 group-hover:scale-[1.045]"
              sizes={imageSizes}
            />
            {!hasElevatedTreatment ? <div className="absolute inset-0 bg-gradient-to-t from-black/18 via-black/0 to-transparent" /> : null}
            {sticker ? (
              <div className="absolute left-3 top-3">
                <Badge variant="outline" className="border-border/70 bg-card/92">
                  {sticker}
                </Badge>
              </div>
            ) : null}
            {listing.status !== "ACTIVE" ? (
              <div className="absolute left-3 top-14">
                <ListingStatusBadge status={listing.status} className="border-border/70 bg-card/92" />
              </div>
            ) : null}
            {!hasElevatedTreatment ? (
              <div className="absolute inset-x-0 bottom-0 flex items-end justify-end gap-3 p-3">
                <div className="rounded-full bg-card/92 px-3.5 py-1.5 text-sm font-semibold text-foreground shadow-soft">
                  {formatCurrency(listing.priceCents / 100)}
                </div>
              </div>
            ) : null}
          </div>
        </Link>

        <div className={cn("space-y-1.5 px-1", hasElevatedTreatment && "space-y-2.5")}>
          <div className={cn("space-y-1", hasElevatedTreatment && "space-y-1.5")}>
            {metaLabel ? (
              <p
                className={cn(
                  "text-[0.78rem] font-medium text-muted-foreground",
                  hasElevatedTreatment && "text-[0.82rem]",
                  isLead && "uppercase tracking-[0.22em] text-foreground/70"
                )}
              >
                {metaLabel}
              </p>
            ) : null}
            <div className="flex items-start justify-between gap-3">
              <Link
                href={`/listing/${listing.id}`}
                className={cn(
                  "line-clamp-2 font-display text-[1.05rem] font-bold leading-tight tracking-tight md:text-[1.12rem]",
                  isLead
                    ? "text-[1.18rem] md:text-[1.32rem]"
                    : layout === "featured"
                      ? "text-[1.12rem] md:text-[1.2rem]"
                      : undefined
                )}
              >
                {listing.title}
              </Link>
              {hasElevatedTreatment ? (
                <p
                  className={cn(
                    "shrink-0 font-display font-extrabold tracking-tight text-foreground",
                    isLead ? "text-[1.3rem] md:text-[1.6rem]" : "text-[1.05rem] md:text-[1.15rem]"
                  )}
                >
                  {formatCurrency(listing.priceCents / 100)}
                </p>
              ) : null}
            </div>
          </div>

          {isLead ? (
            <div className="space-y-3 text-sm">
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[0.82rem] text-muted-foreground">
                <span className="inline-flex items-center gap-1.5 text-foreground/92">
                  <MapPin className="h-3.5 w-3.5 text-uva-orange" />
                  Pickup at {primaryPickup}
                </span>
                <span>{postedLabel}</span>
              </div>
              <div className="space-y-3 border-t border-border/70 pt-3.5">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0 space-y-0.5">
                    <p className="truncate font-medium text-foreground">{sellerDisplayName}</p>
                    {publicUsername ? <p className="text-xs text-muted-foreground">@{publicUsername}</p> : null}
                    {isVerifiedShop ? <VerifiedShopBadge className="mt-2" /> : null}
                  </div>
                  <p className="inline-flex items-center gap-1 text-xs text-foreground/88">
                    <Star className="h-3.5 w-3.5 fill-uva-orange text-uva-orange" />
                    {sellerTrustLabel}
                  </p>
                </div>
                <p className="text-xs leading-6 text-muted-foreground">
                  {listing.sellerCompletedSales > 0
                    ? `${listing.sellerCompletedSales} confirmed sales after real handoffs.`
                    : "Buyer trust shows up after the first confirmed pickup."}
                </p>
              </div>
            </div>
          ) : isFeatured ? (
            <div className="space-y-2 text-sm">
              <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted-foreground">
                <span className="font-medium text-foreground">{sellerDisplayName}</span>
                {publicUsername ? <span>@{publicUsername}</span> : null}
                {isVerifiedShop ? <VerifiedShopBadge className="px-2 py-1 text-[10px]" /> : null}
                {listing.sellerRating ? (
                  <span className="inline-flex items-center gap-1 text-foreground/88">
                    <Star className="h-3.5 w-3.5 fill-uva-orange text-uva-orange" />
                    {sellerTrustLabel}
                  </span>
                ) : null}
              </div>
              <div className="flex flex-wrap items-center gap-x-2 gap-y-1 border-t border-border/70 pt-2 text-xs text-muted-foreground">
                <span className="inline-flex items-center gap-1 text-foreground/88">
                  <MapPin className="h-3.5 w-3.5" />
                  {primaryPickup}
                </span>
                <span>{postedLabel}</span>
              </div>
            </div>
          ) : (
            <div className={cn("flex min-w-0 items-start gap-2.5 text-sm", isFeatured && "gap-3")}>
              <div className="pt-0.5">
                <UserAvatar
                  name={listing.seller.name}
                  username={listing.seller.username}
                  imageUrl={listing.seller.profileImageUrl}
                  className="h-7 w-7 shrink-0"
                />
              </div>
              <div className="min-w-0 flex-1 space-y-1">
                <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                  <p className="truncate font-medium text-foreground">{sellerDisplayName}</p>
                  {publicUsername ? <span className="text-xs text-muted-foreground">@{publicUsername}</span> : null}
                  {isVerifiedShop ? <VerifiedShopBadge className="px-2 py-1 text-[10px]" /> : null}
                </div>
                <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted-foreground">
                  <span className="inline-flex items-center gap-1">
                    <MapPin className="h-3.5 w-3.5" />
                    {primaryPickup}
                  </span>
                  <span>{postedLabel}</span>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </motion.article>
  );
}
