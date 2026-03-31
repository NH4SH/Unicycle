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

  return (
    <div className="container space-y-8 py-8 md:py-10">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="space-y-2">
          <p className="editorial-eyebrow">Campus style network</p>
          <h1 className="font-display text-4xl font-extrabold tracking-tight md:text-5xl">
            From people you follow
          </h1>
          <p className="max-w-2xl text-sm leading-7 text-muted-foreground md:text-base">
            A cleaner HoosFinds feed built around the closets you trust, the sellers you follow, and the style lanes
            you actually want to keep up with.
          </p>
        </div>
        <Link href="/market" className="text-sm font-semibold text-uva-blue hover:text-uva-orange">
          Browse all finds
        </Link>
      </div>

      <FollowingFeedSection
        viewerSignedIn
        feed={feed}
        suggested={suggested}
        maxItems={12}
        title="Recent drops from your network"
        subtitle="These listings are pulled from the sellers you follow, newest first."
        emptyTitle="Your following feed is ready for its first closets"
        emptyDescription="Follow a few active sellers and their latest listings will start showing up here automatically."
      />
    </div>
  );
}
