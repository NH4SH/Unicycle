import { NextResponse } from "next/server";

import { getAuthSession } from "@/lib/auth";
import { unfollowUser } from "@/lib/user-social";

type UnfollowRouteProps = {
  params: {
    id: string;
  };
};

export async function DELETE(_request: Request, { params }: UnfollowRouteProps) {
  const session = await getAuthSession();
  if (!session?.user) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  try {
    const snapshot = await unfollowUser(session.user.id, params.id);

    if (!snapshot) {
      return NextResponse.json({ message: "User not found." }, { status: 404 });
    }

    return NextResponse.json(snapshot);
  } catch (error) {
    return NextResponse.json(
      { message: error instanceof Error ? error.message : "Could not unfollow this user." },
      { status: 400 }
    );
  }
}
