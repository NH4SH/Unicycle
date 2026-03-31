import Link from "next/link";
import { ArrowRight, Sparkles } from "lucide-react";

import { ListingCard } from "@/components/cards/listing-card";
import { EmptyState } from "@/components/shared/empty-state";
import { SellerNetworkCard } from "@/components/social/seller-network-card";
import { SuggestedSellersSection } from "@/components/social/suggested-sellers-section";
import { Button } from "@/components/ui/button";
import { type FollowingFeedData, type ListingCardData } from "@/lib/data";
import type { SellerNetworkProfile } from "@/lib/user-social";

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
};

function FeedGrid({ items }: { items: ListingCardData[] }) {
  return (
    <div className="grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-4">
      {items.map((listing, idx) => (
        <ListingCard
          key={listing.id}
          listing={listing}
          sticker={idx === 0 ? "From people you follow" : idx % 5 === 0 ? "Fresh drop" : undefined}
        />
      ))}
    </div>
  );
}

export function FollowingFeedSection({
  viewerSignedIn,
  feed,
  suggested,
  title = "New drops from sellers you follow",
  subtitle = "Keep tabs on the closets you trust and the style you want first shot at.",
  emptyTitle = "Follow a few closets to shape this feed",
  emptyDescription = "Once you follow sellers, their newest listings show up here so you can catch the good pieces before they disappear.",
  maxItems = 4,
  showSuggestedHeading = true
}: FollowingFeedSectionProps) {
  const items = feed?.items.slice(0, maxItems) ?? [];

  if (!viewerSignedIn) {
    return (
      <SuggestedSellersSection
        title="Popular on Grounds"
        subtitle="Start with active closets putting up strong drops across vintage, streetwear, outerwear, and game day fits."
        items={suggested}
        viewerSignedIn={false}
      />
    );
  }

  return (
    <section className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="space-y-2">
          <p className="editorial-eyebrow">Your network</p>
          <h2 className="font-display text-3xl font-extrabold tracking-tight md:text-4xl">{title}</h2>
          <p className="max-w-2xl text-sm leading-7 text-muted-foreground">{subtitle}</p>
        </div>
        <div className="flex items-center gap-2">
          <Link
            href="/following"
            className="inline-flex items-center gap-2 text-sm font-semibold text-uva-blue transition hover:gap-3"
          >
            View your feed <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </div>

      {items.length ? (
        <>
          <FeedGrid items={items} />

          {suggested.length ? (
            <div className="surface-panel-strong rounded-[1.85rem] p-5">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div className="space-y-2">
                  <p className="editorial-eyebrow">Keep building your feed</p>
                  <h3 className="font-display text-2xl font-bold tracking-tight">More sellers to follow</h3>
                  <p className="max-w-2xl text-sm leading-6 text-muted-foreground">
                    The stronger your network, the more useful your drop feed becomes.
                  </p>
                </div>
                <Button variant="secondary" asChild>
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
