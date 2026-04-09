import Link from "next/link";
import { ArrowRight, MapPin, Sparkles, Star } from "lucide-react";

import { ListingCard } from "@/components/cards/listing-card";
import { EmptyState } from "@/components/shared/empty-state";
import { UserAvatar } from "@/components/shared/user-avatar";
import { SellerNetworkCard } from "@/components/social/seller-network-card";
import { SuggestedSellersSection } from "@/components/social/suggested-sellers-section";
import { Button } from "@/components/ui/button";
import { getPickupLocationShortLabel } from "@/lib/campus-pickup-locations";
import { type FollowingFeedData, type ListingCardData } from "@/lib/data";
import type { SellerNetworkProfile } from "@/lib/user-social";
import { timeAgo } from "@/lib/utils";

type FollowingFeedSectionProps = {
  viewerSignedIn: boolean;
  feed: FollowingFeedData | null;
  suggested: SellerNetworkProfile[];
  title?: string;
  subtitle?: string;
  emptyTitle?: string;
  emptyDescription?: string;
  maxItems?: number;
  showSuggestedHeading?: boolean;
  showViewFeedLink?: boolean;
};

type ClosetActivity = {
  sellerId: string;
  username: string;
  publicUsername: string | null;
  displayName: string;
  name: string | null;
  profileImageUrl: string | null;
  primaryPickup: string;
  latestDropAt: string;
  dropCount: number;
  sellerRating: number | null;
  sellerReviewCount: number;
  sellerCompletedSales: number;
};

function buildClosetActivity(items: ListingCardData[]) {
  const activity = new Map<string, ClosetActivity>();

  for (const item of items) {
    const existing = activity.get(item.seller.id);

    if (!existing) {
      activity.set(item.seller.id, {
        sellerId: item.seller.id,
        username: item.seller.username,
        publicUsername: item.seller.publicUsername,
        displayName: item.seller.displayName,
        name: item.seller.name,
        profileImageUrl: item.seller.profileImageUrl,
        primaryPickup: getPickupLocationShortLabel(item.pickupLocations[0] || "Grounds"),
        latestDropAt: item.createdAt,
        dropCount: 1,
        sellerRating: item.sellerRating,
        sellerReviewCount: item.sellerReviewCount,
        sellerCompletedSales: item.sellerCompletedSales
      });
      continue;
    }

    existing.dropCount += 1;

    if (new Date(item.createdAt) > new Date(existing.latestDropAt)) {
      existing.latestDropAt = item.createdAt;
      existing.primaryPickup = getPickupLocationShortLabel(item.pickupLocations[0] || existing.primaryPickup);
    }
  }

  return [...activity.values()].sort((left, right) => {
    if (right.dropCount !== left.dropCount) {
      return right.dropCount - left.dropCount;
    }

    return new Date(right.latestDropAt).getTime() - new Date(left.latestDropAt).getTime();
  });
}

function getFeedSticker(listing: ListingCardData, index: number) {
  if (index === 0) {
    return "Just dropped";
  }

  if (listing.favoriteCount >= 6) {
    return "Popular now";
  }

  return undefined;
}

function ActiveClosetsRail({ closets }: { closets: ClosetActivity[] }) {
  if (!closets.length) {
    return null;
  }

  const mobileClosets = closets.slice(0, 3);
  const hiddenClosetCount = Math.max(closets.length - mobileClosets.length, 0);

  return (
    <div className="space-y-3 border-t border-border/70 pt-4">
      <p className="hidden text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground md:block">
        {closets.length} active closet{closets.length === 1 ? "" : "s"}
      </p>

      <div className="flex flex-wrap items-center gap-2 md:hidden">
        {mobileClosets.map((closet) => (
          <Link
            key={closet.sellerId}
            href={`/u/${closet.username}`}
            className="surface-chip inline-flex min-h-10 items-center gap-2 px-3.5 py-2 text-[0.8rem] font-medium text-foreground transition hover:border-uva-orange/35 hover:text-uva-orange"
          >
            <span>{closet.publicUsername ? `@${closet.publicUsername}` : closet.displayName}</span>
            <span className="text-muted-foreground">{closet.dropCount} live</span>
          </Link>
        ))}
        {hiddenClosetCount ? (
          <span className="text-xs font-medium text-muted-foreground">+{hiddenClosetCount} more active</span>
        ) : null}
      </div>

      <div className="hidden gap-3 md:grid md:grid-cols-3 xl:grid-cols-4">
        {closets.map((closet) => (
          <Link
            key={closet.sellerId}
            href={`/u/${closet.username}`}
            className="surface-subtle flex items-start gap-3 p-3.5 transition hover:border-uva-orange/35 hover:-translate-y-0.5"
          >
            <UserAvatar
              name={closet.name}
              username={closet.username}
              imageUrl={closet.profileImageUrl}
              className="h-11 w-11 shrink-0"
              fallbackClassName="text-sm"
            />
            <div className="min-w-0 space-y-1">
              <div className="space-y-0.5">
                <p className="truncate font-medium text-foreground">{closet.displayName}</p>
                {closet.publicUsername ? <p className="text-xs text-muted-foreground">@{closet.publicUsername}</p> : null}
              </div>
              <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted-foreground">
                <span>{closet.dropCount} live</span>
                <span>{timeAgo(closet.latestDropAt)}</span>
              </div>
              <div className="inline-flex items-center gap-1 text-xs text-foreground/84 dark:text-white/84">
                <MapPin className="h-3.5 w-3.5 text-uva-orange" />
                {closet.primaryPickup}
              </div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}

function LeadDropPanel({ listing, closet }: { listing: ListingCardData; closet: ClosetActivity | undefined }) {
  const sellerLabel = listing.seller.displayName;

  return (
    <div className="space-y-4">
      <h3 className="font-display text-[1.55rem] font-extrabold tracking-tight text-foreground sm:text-[1.85rem]">Newest from {sellerLabel}</h3>

      <ListingCard listing={listing} layout="lead" sticker="Just dropped" />

      <div className="flex flex-wrap items-center gap-x-4 gap-y-2 border-y border-border/70 py-3 text-sm text-muted-foreground">
        <Link href={`/u/${listing.seller.username}`} className="inline-flex items-center gap-2 text-foreground transition hover:text-uva-orange">
          <UserAvatar
            name={listing.seller.name}
            username={listing.seller.username}
            imageUrl={listing.seller.profileImageUrl}
            className="h-9 w-9 shrink-0"
          />
          <span className="font-medium">{sellerLabel}</span>
          {listing.seller.publicUsername ? <span className="text-xs text-muted-foreground">@{listing.seller.publicUsername}</span> : null}
        </Link>

        <span className="inline-flex items-center gap-1.5 text-foreground/88 dark:text-white/88">
          <MapPin className="h-4 w-4 text-uva-orange" />
          {closet?.primaryPickup || getPickupLocationShortLabel(listing.pickupLocations[0] || "Grounds")}
        </span>

        {closet?.dropCount && closet.dropCount > 1 ? <span>{closet.dropCount} live from this seller</span> : null}
        <span>{timeAgo(listing.createdAt)}</span>

        {listing.sellerRating ? (
          <span className="inline-flex items-center gap-1 text-foreground/88 dark:text-white/88">
            <Star className="h-3.5 w-3.5 fill-uva-orange text-uva-orange" />
            {listing.sellerRating.toFixed(1)} seller rating
          </span>
        ) : listing.sellerCompletedSales > 0 ? (
          <span>{listing.sellerCompletedSales} confirmed sales</span>
        ) : null}

        <Link
          href={`/u/${listing.seller.username}`}
          className="inline-flex items-center gap-2 text-sm font-semibold text-foreground/88 transition hover:gap-3 hover:text-uva-orange dark:text-white/92 dark:hover:text-uva-orange sm:ml-auto"
        >
          Open closet <ArrowRight className="h-4 w-4" />
        </Link>
      </div>
    </div>
  );
}

function FeedGrid({ items }: { items: ListingCardData[] }) {
  const leadItem = items[0];
  const remainingItems = items.slice(1);
  const closets = buildClosetActivity(items);
  const featuredClosets = closets.slice(0, 4);
  const leadCloset = closets.find((closet) => closet.sellerId === leadItem?.seller.id);

  if (!leadItem) {
    return null;
  }

  return (
    <div className="space-y-6">
      <LeadDropPanel listing={leadItem} closet={leadCloset} />

      {remainingItems.length ? (
        <div>
          <div className="grid grid-cols-2 gap-4 md:grid-cols-6 xl:grid-cols-10">
            {remainingItems.map((listing, index) => (
              <ListingCard
                key={listing.id}
                listing={listing}
                layout="default"
                sticker={getFeedSticker(listing, index + 1)}
                className="col-span-1 md:col-span-2 xl:col-span-3"
              />
            ))}
          </div>
        </div>
      ) : null}

      {featuredClosets.length > 1 ? <ActiveClosetsRail closets={featuredClosets} /> : null}
    </div>
  );
}

export function FollowingFeedSection({
  viewerSignedIn,
  feed,
  suggested,
  title = "New drops from sellers you follow",
  subtitle = "Fresh drops from closets you follow, lined up for a faster read.",
  emptyTitle = "Follow a few closets to shape this feed",
  emptyDescription = "Once you follow sellers, their newest listings show up here so you can catch the good pieces before they disappear.",
  maxItems = 4,
  showSuggestedHeading = true,
  showViewFeedLink = true
}: FollowingFeedSectionProps) {
  const items = feed?.items.slice(0, maxItems) ?? [];
  const closetCount = new Set(items.map((item) => item.seller.id)).size;

  if (!viewerSignedIn) {
    return (
      <SuggestedSellersSection
        title="Popular on Grounds"
        subtitle="Start with active closets putting up strong drops across vintage, streetwear, outerwear, and Grounds-ready fits."
        items={suggested}
        viewerSignedIn={false}
      />
    );
  }

  return (
    <section className="space-y-5 md:space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="space-y-2">
          <p className="editorial-eyebrow">Your network</p>
          <h2 className="font-display text-3xl font-extrabold tracking-tight md:text-4xl">{title}</h2>
          <p className="max-w-2xl text-[0.96rem] leading-6 text-foreground/76 dark:text-white/80">{subtitle}</p>
          {items.length ? (
            <div className="inline-flex items-center gap-2 text-sm font-medium text-foreground/90 dark:text-white/88">
              <Sparkles className="h-4 w-4 text-uva-orange" />
              {items.length} drop{items.length === 1 ? "" : "s"} live from {closetCount} closet{closetCount === 1 ? "" : "s"} you follow.
            </div>
          ) : null}
        </div>
        {showViewFeedLink ? (
          <div className="flex items-center gap-2">
            <Link
              href="/following"
              className="inline-flex items-center gap-2 text-sm font-semibold text-foreground/88 transition hover:gap-3 hover:text-uva-orange dark:text-white/92 dark:hover:text-uva-orange"
            >
              View your feed <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        ) : null}
      </div>

      {items.length ? (
        <>
          <FeedGrid items={items} />

          {suggested.length ? (
            <div className="space-y-4 border-t border-border/70 pt-5">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div className="space-y-1">
                  <h3 className="font-display text-xl font-bold tracking-tight">Add a few more closets</h3>
                  <p className="max-w-2xl text-sm leading-6 text-foreground/72 dark:text-white/78">A few more follows will sharpen this feed.</p>
                </div>
                <Button variant="ghost" asChild className="px-0 text-sm font-semibold text-foreground/88 hover:text-uva-orange dark:text-white/92 dark:hover:text-uva-orange">
                  <Link href="/market">Browse all finds</Link>
                </Button>
              </div>
              <div className="mt-5 grid gap-4 lg:grid-cols-3">
                {suggested.slice(0, 3).map((seller) => (
                  <SellerNetworkCard key={seller.id} seller={seller} viewerSignedIn={viewerSignedIn} compact />
                ))}
              </div>
            </div>
          ) : null}
        </>
      ) : (
        <div className="space-y-6">
          <EmptyState title={emptyTitle} description={emptyDescription} ctaHref="/market" ctaLabel="Explore listings" />

          {suggested.length ? (
            <SuggestedSellersSection
              title={showSuggestedHeading ? "Suggested sellers" : "Closets to follow next"}
              subtitle="Start with active UVA sellers putting up the kinds of pieces that fit HoosFinds best."
              items={suggested}
              viewerSignedIn={viewerSignedIn}
            />
          ) : (
            <div className="surface-panel-strong rounded-[1.85rem] p-6">
              <div className="inline-flex items-center gap-2 text-sm font-medium text-muted-foreground">
                <Sparkles className="h-4 w-4 text-uva-orange" />
                More closet recommendations will show up here as seller activity grows.
              </div>
            </div>
          )}
        </div>
      )}
    </section>
  );
}
