import { NextResponse } from "next/server";

import { getAuthSession } from "@/lib/auth";
import { moderateListing } from "@/lib/moderation";
import { adminListingModerationSchema } from "@/lib/validators";

type RouteContext = {
  params: {
    id: string;
  };
};

export async function PATCH(request: Request, { params }: RouteContext) {
  const session = await getAuthSession();

  if (!session?.user?.id) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  if (session.user.role !== "ADMIN") {
    return NextResponse.json({ message: "Forbidden" }, { status: 403 });
  }

  const payload = await request.json();
  const parsed = adminListingModerationSchema.safeParse(payload);

  if (!parsed.success) {
    const flattened = parsed.error.flatten();
    const firstFieldError =
      Object.values(flattened.fieldErrors).flat().find(Boolean) ??
      flattened.formErrors.find(Boolean) ??
      "Please fix the moderation fields and try again.";

    return NextResponse.json(
      {
        message: firstFieldError,
        errors: flattened
      },
      { status: 400 }
    );
  }

  try {
    const listing = await moderateListing({
      listingId: params.id,
      actorId: session.user.id,
      action: parsed.data.action,
      reason: parsed.data.reason ?? "",
      internalNotes: parsed.data.internalNotes
    });

    return NextResponse.json({
      ok: true,
      moderationStatus: listing.moderationStatus,
      moderatedAt: listing.moderatedAt?.toISOString() ?? null
    });
  } catch (error) {
    if (process.env.NODE_ENV !== "production") {
      console.error("[admin/listings]", error);
    }

    return NextResponse.json(
      {
        message: error instanceof Error ? error.message : "Could not update this listing right now."
      },
      { status: 500 }
    );
  }
}
