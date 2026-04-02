import { NextResponse } from "next/server";

import { getAuthSession } from "@/lib/auth";
import { banUser, revokeUserBan } from "@/lib/moderation";
import { adminUserModerationSchema } from "@/lib/validators";

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
  const parsed = adminUserModerationSchema.safeParse(payload);

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
    if (parsed.data.action === "unban") {
      const ban = await revokeUserBan({
        userId: params.id,
        actorId: session.user.id,
        internalNotes: parsed.data.internalNotes
      });

      return NextResponse.json({
        ok: true,
        action: "unban",
        banId: ban.id,
        revokedAt: ban.revokedAt?.toISOString() ?? null
      });
    }

    const endsAt = parsed.data.endsAt ? new Date(parsed.data.endsAt) : null;
    const ban = await banUser({
      userId: params.id,
      actorId: session.user.id,
      reason: parsed.data.reason ?? "",
      internalNotes: parsed.data.internalNotes,
      endsAt
    });

    return NextResponse.json({
      ok: true,
      action: "ban",
      banId: ban.id,
      endsAt: ban.endsAt?.toISOString() ?? null
    });
  } catch (error) {
    if (process.env.NODE_ENV !== "production") {
      console.error("[admin/users]", error);
    }

    return NextResponse.json(
      {
        message: error instanceof Error ? error.message : "Could not update this user right now."
      },
      { status: 500 }
    );
  }
}
