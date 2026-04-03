import { HandoffStatus, TransactionIssueStatus, TransactionStatus } from "@prisma/client";
import { NextResponse } from "next/server";

import { getAuthSession } from "@/lib/auth";
import { assertUserCanAccessMarketplace } from "@/lib/moderation";
import { prisma } from "@/lib/prisma";
import { updateTransactionHandoffSchema } from "@/lib/validators";

type Params = {
  params: {
    id: string;
  };
};

function fromJsonArray(value: unknown) {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.filter((entry): entry is string => typeof entry === "string");
}

export async function POST(request: Request, { params }: Params) {
  const session = await getAuthSession();
  if (!session?.user?.id) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  try {
    await assertUserCanAccessMarketplace(session.user.id);
  } catch (error) {
    return NextResponse.json(
      { message: error instanceof Error ? error.message : "Your account cannot update handoff details right now." },
      { status: 403 }
    );
  }

  const payload = await request.json();
  const parsed = updateTransactionHandoffSchema.safeParse(payload);
  if (!parsed.success) {
    return NextResponse.json({ message: "Invalid handoff details.", errors: parsed.error.flatten() }, { status: 400 });
  }

  const transaction = await prisma.transaction.findUnique({
    where: {
      id: params.id
    },
    include: {
      listing: true,
      issues: {
        where: {
          status: TransactionIssueStatus.OPEN
        },
        select: {
          id: true
        }
      }
    }
  });

  if (!transaction) {
    return NextResponse.json({ message: "Transaction not found." }, { status: 404 });
  }

  const isParticipant = transaction.buyerId === session.user.id || transaction.sellerId === session.user.id;
  if (!isParticipant) {
    return NextResponse.json({ message: "Only the buyer or seller can update the meetup plan." }, { status: 403 });
  }

  if (transaction.status === TransactionStatus.CANCELLED || transaction.status === TransactionStatus.COMPLETED) {
    return NextResponse.json({ message: "This transaction is already closed." }, { status: 409 });
  }

  if (transaction.issues.length > 0) {
    return NextResponse.json({ message: "Resolve the open issue before changing the meetup state." }, { status: 409 });
  }

  const pickupLocations = fromJsonArray(transaction.listing.pickupLocations);
  if (parsed.data.action === "schedule_meetup" && parsed.data.meetupLocation && !pickupLocations.includes(parsed.data.meetupLocation)) {
    return NextResponse.json(
      { message: "Choose one of the listing’s approved campus meetup spots or keep extra details in meetup notes." },
      { status: 400 }
    );
  }

  const meetupScheduledFor = parsed.data.meetupScheduledFor ? new Date(parsed.data.meetupScheduledFor) : undefined;
  const updated = await prisma.transaction.update({
    where: {
      id: transaction.id
    },
    data:
      parsed.data.action === "schedule_meetup"
        ? {
            handoffStatus: HandoffStatus.MEETUP_SCHEDULED,
            meetupLocation: parsed.data.meetupLocation ?? transaction.meetupLocation,
            meetupPlan: parsed.data.meetupPlan ?? transaction.meetupPlan,
            meetupScheduledFor,
            meetupScheduledAt: new Date()
          }
        : {
            handoffStatus: HandoffStatus.HANDOFF_CONFIRMED,
            handoffConfirmedAt: new Date(),
            meetupLocation: parsed.data.meetupLocation ?? transaction.meetupLocation,
            meetupPlan: parsed.data.meetupPlan ?? transaction.meetupPlan,
            meetupScheduledFor: meetupScheduledFor ?? transaction.meetupScheduledFor
          }
  });

  return NextResponse.json({
    id: updated.id,
    status: updated.status,
    handoffStatus: updated.handoffStatus
  });
}
