import { NextResponse } from "next/server";

import { getAuthSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { messageSchema } from "@/lib/validators";

export async function POST(request: Request) {
  const session = await getAuthSession();
  if (!session?.user) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });

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

  const message = await prisma.message.create({
    data: {
      conversationId: parsed.data.conversationId,
      senderId: session.user.id,
      body: parsed.data.body
    }
  });

  return NextResponse.json({ id: message.id, createdAt: message.createdAt.toISOString() }, { status: 201 });
}
