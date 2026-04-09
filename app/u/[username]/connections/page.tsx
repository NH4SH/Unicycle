import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { notFound } from "next/navigation";

import { ConnectionsDashboard } from "@/components/social/connections-dashboard";
import { getAuthSession } from "@/lib/auth";
import { getFollowList, getSuggestedSellers, getUserSocialSnapshot, getUserSummaryByUsername } from "@/lib/user-social";

type ConnectionsPageProps = {
  params: {
    username: string;
  };
  searchParams?: {
    tab?: string;
  };
};

export default async function ConnectionsPage({ params, searchParams }: ConnectionsPageProps) {
  const session = await getAuthSession();
  const user = await getUserSummaryByUsername(params.username);

  if (!user) {
    notFound();
  }

  const [snapshot, followers, following, suggested] = await Promise.all([
    getUserSocialSnapshot(user.id, session?.user.id),
    getFollowList(user.id, "followers", session?.user.id, 1, 12),
    getFollowList(user.id, "following", session?.user.id, 1, 12),
    getSuggestedSellers(session?.user.id, 4)
  ]);

  if (!snapshot) {
    notFound();
  }

  const initialTab = searchParams?.tab === "following" ? "following" : "followers";

  return (
    <div className="container space-y-8 py-8 md:py-10">
      <div className="space-y-3">
        <Link href={`/u/${user.username}`} className="inline-flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-foreground">
          <ChevronLeft className="h-4 w-4" />
          Back to {user.displayName}
        </Link>
        <p className="editorial-eyebrow">Grounds style network</p>
        <h1 className="font-display text-4xl font-extrabold tracking-tight md:text-5xl">
          {session?.user.id === user.id ? "Your closet network" : `${user.displayName}'s network`}
        </h1>
        <p className="max-w-2xl text-sm leading-7 text-muted-foreground md:text-base">
          Followers, follows, and seller discovery for HoosFinds closets people actually want to keep up with.
        </p>
      </div>

      <ConnectionsDashboard
        user={{
          id: user.id,
          username: user.username,
          name: user.name,
          displayName: user.displayName,
          publicUsername: user.publicUsername
        }}
        viewerSignedIn={Boolean(session?.user.id)}
        isSelf={session?.user.id === user.id}
        initialTab={initialTab}
        social={{
          followerCount: snapshot.followerCount,
          followingCount: snapshot.followingCount,
          activeListingCount: snapshot.activeListingCount,
          mutualCount: snapshot.mutualCount
        }}
        initialFollowers={followers}
        initialFollowing={following}
        suggested={suggested}
      />
    </div>
  );
}
