import { NextResponse } from "next/server";

import { getAuthSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { toPublicUserProfile } from "@/lib/public-user";
import { profileSchema } from "@/lib/validators";

export async function PATCH(request: Request) {
  const session = await getAuthSession();
  if (!session?.user) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });

  const payload = await request.json();
  const parsed = profileSchema.safeParse(payload);

  if (!parsed.success) {
    return NextResponse.json({ message: "Invalid profile", errors: parsed.error.flatten() }, { status: 400 });
  }

  const updated = await prisma.user.update({
    where: { id: session.user.id },
    data: {
      bio: parsed.data.bio,
      gradYear: parsed.data.gradYear,
      favoritePickup: parsed.data.favoritePickup,
      profileImageUrl: parsed.data.profileImageUrl === undefined ? undefined : parsed.data.profileImageUrl || null
    },
    select: {
      id: true,
      name: true,
      username: true,
      image: true,
      profileImageUrl: true,
      bio: true,
      gradYear: true,
      favoritePickup: true
    }
  });

  return NextResponse.json({
    user: toPublicUserProfile(updated)
  });
}
