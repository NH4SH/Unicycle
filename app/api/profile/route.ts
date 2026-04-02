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

  const nextUsername = parsed.data.username;
  if (nextUsername && nextUsername !== session.user.username) {
    const existingUsername = await prisma.user.findUnique({
      where: {
        username: nextUsername
      },
      select: {
        id: true
      }
    });

    if (existingUsername && existingUsername.id !== session.user.id) {
      return NextResponse.json({ message: "That username is already taken." }, { status: 409 });
    }
  }

  const updated = await prisma.user.update({
    where: { id: session.user.id },
    data: {
      name: parsed.data.name,
      username: nextUsername,
      usernameConfirmed: nextUsername && nextUsername !== session.user.username ? true : undefined,
      bio: parsed.data.bio,
      gradYear: parsed.data.gradYear,
      favoritePickup: parsed.data.favoritePickup,
      verifiedShopNeighborhood: parsed.data.verifiedShopNeighborhood,
      verifiedShopAddress: parsed.data.verifiedShopAddress,
      verifiedShopInstagram: parsed.data.verifiedShopInstagram,
      verifiedShopWebsite: parsed.data.verifiedShopWebsite === undefined ? undefined : parsed.data.verifiedShopWebsite || null,
      profileImageUrl: parsed.data.profileImageUrl === undefined ? undefined : parsed.data.profileImageUrl || null
    },
    select: {
      id: true,
      name: true,
      username: true,
      usernameConfirmed: true,
      image: true,
      profileImageUrl: true,
      bio: true,
      gradYear: true,
      favoritePickup: true,
      sellerKind: true,
      verifiedShopName: true,
      verifiedShopApprovedAt: true,
      verifiedShopNeighborhood: true,
      verifiedShopAddress: true,
      verifiedShopInstagram: true,
      verifiedShopWebsite: true
    }
  });

  return NextResponse.json({
    user: toPublicUserProfile(updated)
  });
}
