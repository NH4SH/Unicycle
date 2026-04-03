import { HandoffStatus, ListingStatus, TransactionIssueStatus, TransactionStatus } from "@prisma/client";
import { NextResponse } from "next/server";

import { getAuthSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { confirmTransactionSchema } from "@/lib/validators";

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

  const payload = await request.json();
  const parsed = confirmTransactionSchema.safeParse(payload);

  if (!parsed.success) {
    return NextResponse.json({ message: "Invalid confirmation details.", errors: parsed.error.flatten() }, { status: 400 });
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
      },
      review: true,
      listing: true
    }
  });

  if (!transaction) {
    return NextResponse.json({ message: "Transaction not found." }, { status: 404 });
  }

  if (transaction.buyerId !== session.user.id) {
    return NextResponse.json({ message: "Only the selected buyer can confirm receipt." }, { status: 403 });
  }

  if (transaction.sellerId === session.user.id) {
    return NextResponse.json({ message: "Sellers cannot review themselves." }, { status: 400 });
  }

  if (transaction.status !== TransactionStatus.PENDING_CONFIRMATION) {
    return NextResponse.json({ message: "This transaction is no longer waiting on confirmation." }, { status: 409 });
  }

  if (transaction.review) {
    return NextResponse.json({ message: "This transaction has already been reviewed." }, { status: 409 });
  }

  if (transaction.issues.length > 0) {
    return NextResponse.json(
      { message: "Resolve the open handoff issue before confirming that everything went smoothly." },
      { status: 409 }
    );
  }

  const now = new Date();

  const updated = await prisma.$transaction(async (tx) => {
    const completedTransaction = await tx.transaction.update({
      where: {
        id: transaction.id
      },
      data: {
        status: TransactionStatus.COMPLETED,
        handoffStatus: HandoffStatus.RECEIVED,
        confirmedAt: now,
        buyerConfirmedReceivedAt: now
      }
    });

    if (typeof parsed.data.stars === "number") {
      await tx.sellerReview.create({
        data: {
          transactionId: transaction.id,
          reviewerId: transaction.buyerId,
          revieweeId: transaction.sellerId,
          stars: parsed.data.stars,
          comment: parsed.data.comment
        }
      });
    }

    await tx.listing.update({
      where: {
        id: transaction.listingId
      },
      data: {
        status: ListingStatus.COMPLETED
      }
    });

    return completedTransaction;
  });

  return NextResponse.json({ id: updated.id, status: updated.status });
}
