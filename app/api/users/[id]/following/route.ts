import { NextResponse } from "next/server";

import { getAuthSession } from "@/lib/auth";
import { getFollowList, getUserSocialSnapshot } from "@/lib/user-social";
import { followListQuerySchema } from "@/lib/validators";

type FollowingRouteProps = {
  params: {
    id: string;
  };
};

export async function GET(request: Request, { params }: FollowingRouteProps) {
  const session = await getAuthSession();
  const { searchParams } = new URL(request.url);
  const parsed = followListQuerySchema.safeParse({
    page: searchParams.get("page") ?? "1",
    limit: searchParams.get("limit") ?? "12"
  });

  if (!parsed.success) {
    return NextResponse.json({ message: "Invalid pagination." }, { status: 400 });
  }

  const snapshot = await getUserSocialSnapshot(params.id, session?.user.id);

  if (!snapshot) {
    return NextResponse.json({ message: "User not found." }, { status: 404 });
  }

  const following = await getFollowList(params.id, "following", session?.user.id, parsed.data.page, parsed.data.limit);
  return NextResponse.json(following);
}
