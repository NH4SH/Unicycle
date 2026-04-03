import { NextResponse } from "next/server";

import { getAuthSession } from "@/lib/auth";
import { assertUserCanAccessMarketplace } from "@/lib/moderation";
import { prisma } from "@/lib/prisma";
import { createTrustEvent } from "@/lib/trust-signals";
import { reportConversationSchema } from "@/lib/validators";

type Params = {
  params: {
    id: string;
  };
};

type ConversationReportRecord = {
  id: string;
};

type ConversationReportClient = {
  findFirst: (args: unknown) => Promise<ConversationReportRecord | null>;
  create: (args: unknown) => Promise<ConversationReportRecord>;
};

export async function POST(request: Request, { params }: Params) {
  const session = await getAuthSession();
  if (!session?.user?.id) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  try {
    await assertUserCanAccessMarketplace(session.user.id);
  } catch (error) {
    return NextResponse.json(
      { message: error instanceof Error ? error.message : "Your account cannot report conversations right now." },
      { status: 403 }
    );
  }

  const payload = await request.json();
  const parsed = reportConversationSchema.safeParse(payload);
  if (!parsed.success) {
    return NextResponse.json({ message: "Invalid report details.", errors: parsed.error.flatten() }, { status: 400 });
  }

  const conversation = await prisma.conversation.findUnique({
    where: {
      id: params.id
    }
  });

  if (!conversation) {
    return NextResponse.json({ message: "Conversation not found." }, { status: 404 });
  }

  const isParticipant = conversation.buyerId === session.user.id || conversation.sellerId === session.user.id;
  if (!isParticipant) {
    return NextResponse.json({ message: "Only participants can report this conversation." }, { status: 403 });
  }

  // The conversation-report model exists in the schema, but some local/client
  // environments can lag behind on generated Prisma types. Keep this route
  // working without widening email/admin/product changes into a full client regeneration fix.
  const conversationReportClient = (prisma as typeof prisma & {
    conversationReport: ConversationReportClient;
  }).conversationReport;

  const existingReport = await conversationReportClient.findFirst({
    where: {
      conversationId: conversation.id,
      reporterId: session.user.id,
      status: "OPEN"
    },
    select: {
      id: true
    }
  });

  if (existingReport) {
    return NextResponse.json({ message: "You already have an open report on this conversation." }, { status: 409 });
  }

  const report = await conversationReportClient.create({
    data: {
      conversationId: conversation.id,
      reporterId: session.user.id,
      reason: parsed.data.reason
    }
  });

  const targetUserId = session.user.id === conversation.buyerId ? conversation.sellerId : conversation.buyerId;
  try {
    await createTrustEvent({
      userId: targetUserId,
      type: "CONVERSATION_REPORTED",
      description: parsed.data.reason,
      metadata: {
        conversationId: conversation.id,
        reportId: report.id,
        reporterId: session.user.id,
        requiresReview: true
      }
    });
  } catch (error) {
    if (process.env.NODE_ENV !== "production") {
      console.error("[conversations/report] trust logging failed", error);
    }
  }

  return NextResponse.json({ ok: true, id: report.id });
}
