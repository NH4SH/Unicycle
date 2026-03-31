import { NextResponse } from "next/server";

import { getAuthSession } from "@/lib/auth";
import { followUser } from "@/lib/user-social";

type FollowRouteProps = {
  params: {
    id: string;
  };
};

export async function POST(_request: Request, { params }: FollowRouteProps) {
  const session = await getAuthSession();
  if (!session?.user) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  try {
    const snapshot = await followUser(session.user.id, params.id);

    if (!snapshot) {
      return NextResponse.json({ message: "User not found." }, { status: 404 });
    }

    return NextResponse.json(snapshot);
  } catch (error) {
    return NextResponse.json(
      { message: error instanceof Error ? error.message : "Could not follow this user." },
      { status: 400 }
    );
  }
}
