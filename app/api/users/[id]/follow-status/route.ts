import { NextResponse } from "next/server";

import { getAuthSession } from "@/lib/auth";
import { getUserSocialSnapshot } from "@/lib/user-social";

type FollowStatusRouteProps = {
  params: {
    id: string;
  };
};

export async function GET(_request: Request, { params }: FollowStatusRouteProps) {
  const session = await getAuthSession();
  const snapshot = await getUserSocialSnapshot(params.id, session?.user.id);

  if (!snapshot) {
    return NextResponse.json({ message: "User not found." }, { status: 404 });
  }

  return NextResponse.json({
    isFollowing: snapshot.isFollowing,
    isSelf: snapshot.isSelf,
    followerCount: snapshot.followerCount,
    followingCount: snapshot.followingCount,
    mutualCount: snapshot.mutualCount,
    styleTags: snapshot.styleTags,
    activeListingCount: snapshot.activeListingCount,
    recentDropAt: snapshot.recentDropAt
  });
}
