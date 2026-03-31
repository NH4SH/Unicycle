import { NextResponse } from "next/server";

import { getAuthSession } from "@/lib/auth";
import { getSuggestedSellers } from "@/lib/user-social";
import { followSuggestionsQuerySchema } from "@/lib/validators";

export async function GET(request: Request) {
  const session = await getAuthSession();
  const { searchParams } = new URL(request.url);
  const parsed = followSuggestionsQuerySchema.safeParse({
    limit: searchParams.get("limit") ?? "6"
  });

  if (!parsed.success) {
    return NextResponse.json({ message: "Invalid limit." }, { status: 400 });
  }

  const items = await getSuggestedSellers(session?.user.id, parsed.data.limit);

  return NextResponse.json({
    items
  });
}
