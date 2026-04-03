import { ListingStatus, TransactionStatus } from "@prisma/client";
import { NextResponse } from "next/server";

import { getAuthSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { createTrustEvent } from "@/lib/trust-signals";

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
    },
    include: {
      listing: true
    }
  });

  if (!transaction) {
    return NextResponse.json({ message: "Transaction not found." }, { status: 404 });
  }

  if (transaction.sellerId !== session.user.id) {
    return NextResponse.json({ message: "Only the seller can relist this item." }, { status: 403 });
  }

  if (transaction.status !== TransactionStatus.CANCELLED || transaction.listing.status !== ListingStatus.CANCELLED) {
    return NextResponse.json({ message: "This item is not currently in a cancelled state." }, { status: 409 });
  }

  await prisma.listing.update({
    where: {
      id: transaction.listingId
    },
    data: {
      status: ListingStatus.ACTIVE,
      soldToUserId: null
    }
  });

  try {
    await createTrustEvent({
      userId: transaction.sellerId,
      type: "RELIST_AFTER_FAILED_HANDOFF",
      transactionId: transaction.id,
      listingId: transaction.listingId,
      metadata: {
        relistedByUserId: session.user.id
      }
    });
  } catch (error) {
    if (process.env.NODE_ENV !== "production") {
      console.error("[transactions/relist] trust logging failed", error);
    }
  }

  return NextResponse.json({ ok: true });
}
