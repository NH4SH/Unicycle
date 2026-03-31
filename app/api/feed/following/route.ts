import { NextResponse } from "next/server";

import { getAuthSession } from "@/lib/auth";
import { getFollowingFeedListings } from "@/lib/data";
import { followingFeedQuerySchema } from "@/lib/validators";

export async function GET(request: Request) {
  const session = await getAuthSession();

  if (!session?.user.id) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const parsed = followingFeedQuerySchema.safeParse({
    page: searchParams.get("page") ?? "1",
    limit: searchParams.get("limit") ?? "8"
  });

  if (!parsed.success) {
    return NextResponse.json({ message: "Invalid feed request." }, { status: 400 });
  }

  const feed = await getFollowingFeedListings(session.user.id, parsed.data.page, parsed.data.limit);

  return NextResponse.json(feed);
}
