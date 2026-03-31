import { NextResponse } from "next/server";

import { getFollowList, getUserSocialSnapshot } from "@/lib/user-social";

type FollowersRouteProps = {
  params: {
    id: string;
  };
};

export async function GET(_request: Request, { params }: FollowersRouteProps) {
  const snapshot = await getUserSocialSnapshot(params.id);

  if (!snapshot) {
    return NextResponse.json({ message: "User not found." }, { status: 404 });
  }

  const followers = await getFollowList(params.id, "followers");
  return NextResponse.json({
    userId: params.id,
    count: snapshot.followerCount,
    items: followers
  });
}
