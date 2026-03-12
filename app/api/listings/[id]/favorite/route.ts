import { NextResponse } from "next/server";

import { getAuthSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

type Params = { params: { id: string } };

export async function POST(_: Request, { params }: Params) {
  const session = await getAuthSession();
  if (!session?.user) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  const existing = await prisma.favorite.findUnique({
    where: {
      userId_listingId: {
        userId: session.user.id,
        listingId: params.id
      }
    }
  });

  if (existing) {
    await prisma.favorite.delete({
      where: {
        userId_listingId: {
          userId: session.user.id,
          listingId: params.id
        }
      }
    });

    return NextResponse.json({ favorited: false });
  }

  await prisma.favorite.create({
    data: {
      listingId: params.id,
      userId: session.user.id
    }
  });

  return NextResponse.json({ favorited: true });
}
