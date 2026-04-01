import Link from "next/link";

import { EmptyState } from "@/components/shared/empty-state";
import { FollowingFeedSection } from "@/components/social/following-feed-section";
import { getAuthSession } from "@/lib/auth";
import { getFollowingFeedListings } from "@/lib/data";
import { getSuggestedSellers } from "@/lib/user-social";

export default async function FollowingFeedPage() {
  const session = await getAuthSession();

  if (!session?.user.id) {
    const suggested = await getSuggestedSellers(undefined, 6);

    return (
      <div className="container space-y-8 py-8 md:py-10">
        <EmptyState
          title="Sign in to build your drop feed"
          description="Follow sellers whose style you like, and HoosFinds will turn that into a cleaner feed of future finds."
          ctaHref="/sign-in?callbackUrl=%2Ffollowing"
          ctaLabel="Sign in with UVA email"
        />

        <FollowingFeedSection viewerSignedIn={false} feed={null} suggested={suggested} />
      </div>
    );
  }

  const [feed, suggested] = await Promise.all([
    getFollowingFeedListings(session.user.id, 1, 12),
    getSuggestedSellers(session.user.id, 6)
  ]);
  const activeClosets = new Set(feed.items.map((item) => item.seller.id)).size;

  return (
    <div className="container space-y-8 py-8 md:py-10">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="space-y-2">
          <p className="editorial-eyebrow">Your closet network</p>
          <h1 className="font-display text-4xl font-extrabold tracking-tight md:text-5xl">
            Keep up with the sellers you follow
          </h1>
          <p className="max-w-2xl text-sm leading-7 text-muted-foreground md:text-base">
            {feed.items.length
              ? `${feed.items.length} live drops from ${activeClosets} closet${activeClosets === 1 ? "" : "s"} you follow.`
              : "Once you follow a few sellers, their newest drops land here first."}
          </p>
        </div>
        <Link
          href="/market"
          className="text-sm font-semibold text-foreground/88 transition hover:text-uva-orange dark:text-white/92 dark:hover:text-uva-orange"
        >
          Browse all finds
        </Link>
      </div>

      <FollowingFeedSection
        viewerSignedIn
        feed={feed}
        suggested={suggested}
        maxItems={12}
        title="Fresh drops from your network"
        subtitle="Newest drops from closets you follow."
        emptyTitle="Your following feed is ready for its first closets"
        emptyDescription="Follow a few active sellers and their latest listings will start showing up here automatically."
        showViewFeedLink={false}
      />
    </div>
  );
}
