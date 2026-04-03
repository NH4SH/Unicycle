import { NextResponse } from "next/server";

import { getAuthSession } from "@/lib/auth";
import { assertUsersCanMessageEachOther } from "@/lib/message-safety";
import { assertUserCanAccessMarketplace } from "@/lib/moderation";
import { prisma } from "@/lib/prisma";
import { messageSchema } from "@/lib/validators";

export async function POST(request: Request) {
  const session = await getAuthSession();
  if (!session?.user) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });

  try {
    await assertUserCanAccessMarketplace(session.user.id);
  } catch (error) {
    return NextResponse.json(
      { message: error instanceof Error ? error.message : "Your account cannot send messages right now." },
      { status: 403 }
    );
  }

  const payload = await request.json();
  const parsed = messageSchema.safeParse(payload);

  if (!parsed.success) {
    return NextResponse.json({ message: "Invalid payload", errors: parsed.error.flatten() }, { status: 400 });
  }

  const conversation = await prisma.conversation.findUnique({
    where: { id: parsed.data.conversationId }
  });

  if (!conversation) {
    return NextResponse.json({ message: "Conversation not found" }, { status: 404 });
  }

  const isParticipant = conversation.buyerId === session.user.id || conversation.sellerId === session.user.id;
  if (!isParticipant) {
    return NextResponse.json({ message: "Forbidden" }, { status: 403 });
  }

  try {
    await assertUsersCanMessageEachOther(
      session.user.id,
      conversation.buyerId === session.user.id ? conversation.sellerId : conversation.buyerId
    );
  } catch (error) {
    return NextResponse.json(
      { message: error instanceof Error ? error.message : "Messaging is unavailable in this conversation." },
      { status: 403 }
    );
  }

  const message = await prisma.message.create({
    data: {
      conversationId: parsed.data.conversationId,
      senderId: session.user.id,
      body: parsed.data.body
    }
  });

  return NextResponse.json({ id: message.id, createdAt: message.createdAt.toISOString() }, { status: 201 });
}
