import { HandoffStatus, TransactionIssueStatus, TransactionStatus } from "@prisma/client";
import { NextResponse } from "next/server";

import { getAuthSession } from "@/lib/auth";
import { assertUserCanAccessMarketplace } from "@/lib/moderation";
import { prisma } from "@/lib/prisma";
import { createTrustEvent } from "@/lib/trust-signals";
import { type TrustEventTypeValue } from "@/lib/trust-types";
import { reportTransactionIssueSchema } from "@/lib/validators";

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

  try {
    await assertUserCanAccessMarketplace(session.user.id);
  } catch (error) {
    return NextResponse.json(
      { message: error instanceof Error ? error.message : "Your account cannot report transaction issues right now." },
      { status: 403 }
    );
  }

  const payload = await request.json();
  const parsed = reportTransactionIssueSchema.safeParse(payload);
  if (!parsed.success) {
    return NextResponse.json({ message: "Invalid issue details.", errors: parsed.error.flatten() }, { status: 400 });
  }

  const transaction = await prisma.transaction.findUnique({
    where: {
      id: params.id
    },
    include: {
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
    return NextResponse.json({ message: "Only the buyer or seller can report a transaction issue." }, { status: 403 });
  }

  if (transaction.status === TransactionStatus.CANCELLED || transaction.status === TransactionStatus.COMPLETED) {
    return NextResponse.json({ message: "This transaction is already closed." }, { status: 409 });
  }

  if (transaction.issues.length > 0) {
    return NextResponse.json({ message: "There is already an open issue on this transaction." }, { status: 409 });
  }

  const issue = await prisma.$transaction(async (tx) => {
    const createdIssue = await tx.transactionIssue.create({
      data: {
        transactionId: transaction.id,
        reporterId: session.user.id,
        issueType: parsed.data.issueType,
        description: parsed.data.description
      }
    });

    await tx.transaction.update({
      where: {
        id: transaction.id
      },
      data: {
        status: TransactionStatus.ISSUE_REPORTED,
        handoffStatus: HandoffStatus.ISSUE_REPORTED
      }
    });

    return createdIssue;
  });

  let trustUserId = session.user.id === transaction.sellerId ? transaction.buyerId : transaction.sellerId;
  let trustType: TrustEventTypeValue = "ISSUE_REPORTED";

  if (parsed.data.issueType === "SELLER_NO_SHOW") {
    trustUserId = transaction.sellerId;
    trustType = "SELLER_NO_SHOW";
  } else if (parsed.data.issueType === "BUYER_NO_SHOW") {
    trustUserId = transaction.buyerId;
    trustType = "BUYER_NO_SHOW";
  }

  try {
    await createTrustEvent({
      userId: trustUserId,
      type: trustType,
      description: parsed.data.description,
      transactionId: transaction.id,
      listingId: transaction.listingId,
      metadata: {
        issueId: issue.id,
        issueType: parsed.data.issueType,
        reporterId: session.user.id
      }
    });
  } catch (error) {
    if (process.env.NODE_ENV !== "production") {
      console.error("[transactions/issue] trust logging failed", error);
    }
  }

  return NextResponse.json({
    id: issue.id,
    status: TransactionIssueStatus.OPEN,
    transactionStatus: TransactionStatus.ISSUE_REPORTED
  });
}
