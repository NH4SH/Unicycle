import { NextResponse } from "next/server";

import { getAuthSession } from "@/lib/auth";
import { getMutualsForUser, getUserSocialSnapshot } from "@/lib/user-social";
import { followSuggestionsQuerySchema } from "@/lib/validators";

type MutualsRouteProps = {
  params: {
    id: string;
  };
};

export async function GET(request: Request, { params }: MutualsRouteProps) {
  const session = await getAuthSession();

  if (!session?.user.id) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  const user = await getUserSocialSnapshot(params.id, session.user.id);

  if (!user) {
    return NextResponse.json({ message: "User not found." }, { status: 404 });
  }

  const { searchParams } = new URL(request.url);
  const parsed = followSuggestionsQuerySchema.safeParse({
    limit: searchParams.get("limit") ?? "6"
  });

  if (!parsed.success) {
    return NextResponse.json({ message: "Invalid limit." }, { status: 400 });
  }

  const mutuals = await getMutualsForUser(params.id, session.user.id, parsed.data.limit);
  return NextResponse.json(mutuals);
}
