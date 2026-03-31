import { ListingStatus, TransactionStatus } from "@prisma/client";
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

  const transaction = await prisma.transaction.findUnique({
    where: {
      id: params.id
    }
  });

  if (!transaction) {
    return NextResponse.json({ message: "Transaction not found." }, { status: 404 });
  }

  if (transaction.sellerId !== session.user.id) {
    return NextResponse.json({ message: "Only the seller can cancel this pending sale." }, { status: 403 });
  }

  if (transaction.status !== TransactionStatus.PENDING_CONFIRMATION) {
    return NextResponse.json({ message: "Only pending sales can be cancelled." }, { status: 409 });
  }

  await prisma.$transaction(async (tx) => {
    await tx.transaction.update({
      where: {
        id: transaction.id
      },
      data: {
        status: TransactionStatus.CANCELLED
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
