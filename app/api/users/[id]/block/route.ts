import { NextResponse } from "next/server";

import { getAuthSession } from "@/lib/auth";
import { createTrustEvent } from "@/lib/trust-signals";
import { blockUserSchema } from "@/lib/validators";

import { prisma } from "@/lib/prisma";

type Params = {
  params: {
    id: string;
  };
};

export async function POST(request: Request, { params }: Params) {
  const session = await getAuthSession();
  if (!session?.user?.id) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  if (params.id === session.user.id) {
    return NextResponse.json({ message: "You cannot block yourself." }, { status: 400 });
  }

  const payload = await request.json().catch(() => ({}));
  const parsed = blockUserSchema.safeParse(payload);
  if (!parsed.success) {
    return NextResponse.json({ message: "Invalid block details.", errors: parsed.error.flatten() }, { status: 400 });
  }

  const targetUser = await prisma.user.findUnique({
    where: {
      id: params.id
    },
    select: {
      id: true
    }
  });

  if (!targetUser) {
    return NextResponse.json({ message: "User not found." }, { status: 404 });
  }

  await prisma.userBlock.upsert({
    where: {
      blockerUserId_blockedUserId: {
        blockerUserId: session.user.id,
        blockedUserId: params.id
      }
    },
    create: {
      blockerUserId: session.user.id,
      blockedUserId: params.id,
      reason: parsed.data.reason
    },
    update: {
      reason: parsed.data.reason
    }
  });

  try {
    await createTrustEvent({
      userId: params.id,
      type: "USER_BLOCKED",
      description: parsed.data.reason,
      metadata: {
        blockerUserId: session.user.id
      }
    });
  } catch (error) {
    if (process.env.NODE_ENV !== "production") {
      console.error("[users/block] trust logging failed", error);
    }
  }

  return NextResponse.json({ ok: true, blockedUserId: params.id });
}
