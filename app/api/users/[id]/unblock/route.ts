import { NextResponse } from "next/server";

import { getAuthSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

type Params = {
  params: {
    id: string;
  };
};

export async function POST(_: Request, { params }: Params) {
  const session = await getAuthSession();
  if (!session?.user?.id) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  await prisma.userBlock.deleteMany({
    where: {
      blockerUserId: session.user.id,
      blockedUserId: params.id
    }
  });

  return NextResponse.json({ ok: true, unblockedUserId: params.id });
}
