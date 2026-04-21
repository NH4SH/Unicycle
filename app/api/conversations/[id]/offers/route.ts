import { ListingModerationStatus, ListingStatus, OfferStatus, TransactionStatus } from "@prisma/client";
import { NextResponse } from "next/server";

import { getAuthSession } from "@/lib/auth";
import { assertUsersCanMessageEachOther } from "@/lib/message-safety";
import { assertUserCanAccessMarketplace } from "@/lib/moderation";
import { notifyMessageReceived } from "@/lib/notifications";
import { prisma } from "@/lib/prisma";
import { formatCurrencyFromCents } from "@/lib/utils";
import { createOfferSchema } from "@/lib/validators";

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

  if (!session.user.canBuy) {
    return NextResponse.json({ message: "Only UVA student buyers can make offers on HoosFinds." }, { status: 403 });
  }

  try {
    await assertUserCanAccessMarketplace(session.user.id);
  } catch (error) {
    return NextResponse.json(
      { message: error instanceof Error ? error.message : "Your account cannot make offers right now." },
      { status: 403 }
    );
  }

  const payload = await request.json().catch(() => ({}));
  const parsed = createOfferSchema.safeParse({ ...payload, conversationId: params.id });

  if (!parsed.success) {
    return NextResponse.json({ message: "Invalid offer details.", errors: parsed.error.flatten() }, { status: 400 });
  }

  const conversation = await prisma.conversation.findUnique({
    where: {
      id: parsed.data.conversationId
    },
    include: {
      listing: true,
      offers: {
        where: {
          buyerId: session.user.id,
          status: OfferStatus.PENDING
        },
        select: {
          id: true
        },
        take: 1
      },
      transactions: {
        where: {
          status: {
            in: [TransactionStatus.PENDING_CONFIRMATION, TransactionStatus.ISSUE_REPORTED, TransactionStatus.COMPLETED]
          }
        },
        select: {
          id: true
        },
        take: 1
      }
    }
  });

  if (!conversation) {
    return NextResponse.json({ message: "Conversation not found." }, { status: 404 });
  }

  if (conversation.buyerId !== session.user.id) {
    return NextResponse.json({ message: "Only the buyer in this thread can make an offer." }, { status: 403 });
  }

  if (conversation.listing.sellerId === session.user.id) {
    return NextResponse.json({ message: "You cannot make an offer on your own listing." }, { status: 400 });
  }

  if (conversation.listing.status !== ListingStatus.ACTIVE || conversation.listing.moderationStatus !== ListingModerationStatus.VISIBLE) {
    return NextResponse.json({ message: "This listing is not available for new offers." }, { status: 409 });
  }

  if (conversation.transactions.length > 0) {
    return NextResponse.json({ message: "This listing already has an active sale in progress." }, { status: 409 });
  }

  if (conversation.offers.length > 0) {
    return NextResponse.json({ message: "You already have a pending offer in this thread." }, { status: 409 });
  }

  if (parsed.data.amountCents > conversation.listing.priceCents) {
    return NextResponse.json({ message: "Offers cannot be higher than the listed price." }, { status: 400 });
  }

  try {
    await assertUsersCanMessageEachOther(session.user.id, conversation.sellerId);
  } catch (error) {
    return NextResponse.json(
      { message: error instanceof Error ? error.message : "Offers are unavailable in this conversation." },
      { status: 403 }
    );
  }

  const amountLabel = formatCurrencyFromCents(parsed.data.amountCents, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });

  const result = await prisma.$transaction(async (tx) => {
    const offer = await tx.conversationOffer.create({
      data: {
        conversationId: conversation.id,
        listingId: conversation.listingId,
        buyerId: conversation.buyerId,
        sellerId: conversation.sellerId,
        amountCents: parsed.data.amountCents,
        note: parsed.data.note
      }
    });

    const message = await tx.message.create({
      data: {
        conversationId: conversation.id,
        senderId: session.user.id,
        kind: "OFFER",
        offerId: offer.id,
        body: parsed.data.note ? `Offer ${amountLabel}: ${parsed.data.note}` : `Offer ${amountLabel}`
      }
    });

    return { offer, message };
  });

  try {
    await notifyMessageReceived(result.message.id);
  } catch (error) {
    if (process.env.NODE_ENV !== "production") {
      console.error("[offers] notification failed", error);
    }
  }

  return NextResponse.json(
    {
      id: result.offer.id,
      messageId: result.message.id,
      amountCents: result.offer.amountCents,
      status: result.offer.status,
      createdAt: result.offer.createdAt.toISOString()
    },
    { status: 201 }
  );
}
