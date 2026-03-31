import { NextResponse } from "next/server";

import { getAuthSession } from "@/lib/auth";
import { getUserSocialSnapshot } from "@/lib/user-social";

type UserRouteProps = {
  params: {
    id: string;
  };
};

export async function GET(_request: Request, { params }: UserRouteProps) {
  const session = await getAuthSession();
  const snapshot = await getUserSocialSnapshot(params.id, session?.user.id);

  if (!snapshot) {
    return NextResponse.json({ message: "User not found." }, { status: 404 });
  }

  return NextResponse.json(snapshot);
}
