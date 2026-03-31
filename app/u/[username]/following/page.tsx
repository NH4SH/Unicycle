import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { notFound } from "next/navigation";

import { FollowListClient } from "@/components/social/follow-list-client";
import { SuggestedSellersSection } from "@/components/social/suggested-sellers-section";
import { getAuthSession } from "@/lib/auth";
import { getSuggestedSellers, getFollowList, getUserSummaryByUsername } from "@/lib/user-social";

type FollowingPageProps = {
  params: {
    username: string;
  };
};

export default async function FollowingPage({ params }: FollowingPageProps) {
  const session = await getAuthSession();
  const user = await getUserSummaryByUsername(params.username);

  if (!user) {
    notFound();
  }

  const [following, suggested] = await Promise.all([
    getFollowList(user.id, "following", session?.user.id, 1, 12),
    getSuggestedSellers(session?.user.id, 3)
  ]);

  return (
    <div className="container space-y-8 py-8 md:py-10">
      <div className="space-y-3">
        <Link href={`/u/${user.username}`} className="inline-flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-foreground">
          <ChevronLeft className="h-4 w-4" />
          Back to @{user.username}
        </Link>
        <p className="editorial-eyebrow">Campus style network</p>
        <h1 className="font-display text-4xl font-extrabold tracking-tight md:text-5xl">
          Closets @{user.username} follows
        </h1>
        <p className="max-w-2xl text-sm leading-7 text-muted-foreground md:text-base">
          The sellers, drops, and style lanes shaping this person’s HoosFinds feed.
        </p>
      </div>

      <FollowListClient
        userId={user.id}
        username={user.username}
        direction="following"
        viewerSignedIn={Boolean(session?.user.id)}
        initialItems={following.items}
        initialHasMore={following.hasMore}
        initialPage={following.page}
      />

      <SuggestedSellersSection
        title="Popular on Grounds"
        subtitle="Fashion-forward UVA sellers worth following if you want a sharper drop feed."
        items={suggested}
        viewerSignedIn={Boolean(session?.user.id)}
      />
    </div>
  );
}
