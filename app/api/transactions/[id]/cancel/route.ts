import { HandoffStatus, ListingStatus, OrderStatus, TransactionStatus, TrustEventType } from "@prisma/client";
import { NextResponse } from "next/server";

import { getAuthSession } from "@/lib/auth";
import { refundOrderPayment } from "@/lib/order-refunds";
import { prisma } from "@/lib/prisma";
import { cancelTransactionSchema } from "@/lib/validators";

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

  const payload = await request.json().catch(() => ({}));
  const parsed = cancelTransactionSchema.safeParse(payload);
  if (!parsed.success) {
    return NextResponse.json({ message: "Invalid cancellation details.", errors: parsed.error.flatten() }, { status: 400 });
  }

  const transaction = await prisma.transaction.findUnique({
    where: {
      id: params.id
    },
    include: {
      listing: true,
      order: true
    }
  });

  if (!transaction) {
    return NextResponse.json({ message: "Transaction not found." }, { status: 404 });
  }

  const canCancel = transaction.sellerId === session.user.id || session.user.role === "ADMIN";
  if (!canCancel) {
    return NextResponse.json({ message: "Only the seller or an admin can cancel this sale." }, { status: 403 });
  }

  if (transaction.status === TransactionStatus.COMPLETED || transaction.status === TransactionStatus.CANCELLED) {
    return NextResponse.json({ message: "Only active sale flows can be cancelled." }, { status: 409 });
  }

  if (transaction.order?.status === OrderStatus.REFUND_PENDING) {
    return NextResponse.json({ message: "A refund is already being processed for this paid sale." }, { status: 409 });
  }

  if (transaction.order?.status === OrderStatus.PAID) {
    const refund = await refundOrderPayment({
      orderId: transaction.order.id,
      initiatedByUserId: session.user.id,
      reason: parsed.data.reason ?? "The seller cancelled this paid HoosFinds sale before the handoff was completed.",
      note: parsed.data.reason,
      listingStrategy: "cancel",
      trustEventType: session.user.role === "ADMIN" ? undefined : TrustEventType.PAID_CANCELLATION,
      trustUserId: transaction.sellerId
    });

    return NextResponse.json({
      ok: true,
      refunded: true,
      alreadyRefunded: refund.alreadyRefunded,
      refundId: "refundId" in refund ? refund.refundId : null
    });
  }

  await prisma.$transaction(async (tx) => {
    await tx.transaction.update({
      where: {
        id: transaction.id
      },
      data: {
        status: TransactionStatus.CANCELLED,
        handoffStatus: HandoffStatus.CANCELLED
      }
    });

    await tx.listing.update({
      where: {
        id: transaction.listingId
      },
      data: {
        status: ListingStatus.CANCELLED,
        soldToUserId: null
      }
    });
  });

  return NextResponse.json({ ok: true });
}
