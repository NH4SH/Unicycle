import { HandoffStatus, ListingStatus, TransactionStatus } from "@prisma/client";
import { NextResponse } from "next/server";

import { getAuthSession } from "@/lib/auth";
import { getListingMutationProtection } from "@/lib/listing-guardrails";
import { assertUserCanAccessMarketplace } from "@/lib/moderation";
import { prisma } from "@/lib/prisma";
import { createTransactionSchema } from "@/lib/validators";

export async function POST(request: Request) {
  const session = await getAuthSession();
  if (!session?.user?.id) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  try {
    await assertUserCanAccessMarketplace(session.user.id);
  } catch (error) {
    return NextResponse.json(
      { message: error instanceof Error ? error.message : "Your account cannot manage sale handoffs right now." },
      { status: 403 }
    );
  }

  const payload = await request.json();
  const parsed = createTransactionSchema.safeParse(payload);

  if (!parsed.success) {
    return NextResponse.json({ message: "Invalid sale selection.", errors: parsed.error.flatten() }, { status: 400 });
  }

  const conversation = await prisma.conversation.findUnique({
    where: {
      id: parsed.data.conversationId
    },
    include: {
      listing: true
    }
  });

  if (!conversation) {
    return NextResponse.json({ message: "Conversation not found." }, { status: 404 });
  }

  if (conversation.sellerId !== session.user.id) {
    return NextResponse.json({ message: "Only the seller can mark an item as sold." }, { status: 403 });
  }

  if (conversation.listing.status === ListingStatus.PENDING_CONFIRMATION) {
    return NextResponse.json({ message: "This listing is already waiting on buyer confirmation." }, { status: 409 });
  }

  if (conversation.listing.status === ListingStatus.COMPLETED) {
    return NextResponse.json({ message: "This listing has already been completed." }, { status: 409 });
  }

  if (conversation.listing.status === ListingStatus.CANCELLED) {
    return NextResponse.json({ message: "Relist this item before marking it sold again." }, { status: 409 });
  }

  const protection = await getListingMutationProtection(conversation.listingId);
  if (protection.blocked) {
    return NextResponse.json({ message: protection.message }, { status: 409 });
  }

  const activeTransaction = await prisma.transaction.findFirst({
    where: {
      listingId: conversation.listingId,
      status: {
        in: [TransactionStatus.PENDING_CONFIRMATION, TransactionStatus.ISSUE_REPORTED, TransactionStatus.COMPLETED]
      }
    },
    select: {
      id: true
    }
  });

  if (activeTransaction) {
    return NextResponse.json({ message: "This listing already has an active sale record." }, { status: 409 });
  }

  const now = new Date();

  const transaction = await prisma.$transaction(async (tx) => {
    const created = await tx.transaction.create({
      data: {
        listingId: conversation.listingId,
        sellerId: conversation.sellerId,
        buyerId: conversation.buyerId,
        conversationId: conversation.id,
        status: TransactionStatus.PENDING_CONFIRMATION,
        handoffStatus: HandoffStatus.HANDOFF_CONFIRMED,
        agreedPriceCents: parsed.data.agreedPriceCents ?? conversation.listing.priceCents,
        sellerMarkedSoldAt: now
      }
    });

    await tx.listing.update({
      where: {
        id: conversation.listingId
      },
      data: {
        status: ListingStatus.PENDING_CONFIRMATION,
        soldToUserId: conversation.buyerId
      }
    });

    return created;
  });

  return NextResponse.json({ id: transaction.id }, { status: 201 });
}
