import { NextResponse } from "next/server";

import { getFollowList, getUserSocialSnapshot } from "@/lib/user-social";

type FollowingRouteProps = {
  params: {
    id: string;
  };
};

export async function GET(_request: Request, { params }: FollowingRouteProps) {
  const snapshot = await getUserSocialSnapshot(params.id);

  if (!snapshot) {
    return NextResponse.json({ message: "User not found." }, { status: 404 });
  }

  const following = await getFollowList(params.id, "following");
  return NextResponse.json({
    userId: params.id,
    count: snapshot.followingCount,
    items: following
  });
}
