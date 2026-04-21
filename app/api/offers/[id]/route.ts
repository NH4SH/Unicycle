import { HandoffStatus, ListingModerationStatus, ListingStatus, NotificationType, OfferStatus, TransactionStatus } from "@prisma/client";
import { NextResponse } from "next/server";

import { getAuthSession } from "@/lib/auth";
import { getListingMutationProtection } from "@/lib/listing-guardrails";
import { assertUserCanAccessMarketplace } from "@/lib/moderation";
import { createNotification } from "@/lib/notifications";
import { prisma } from "@/lib/prisma";
import { formatCurrencyFromCents } from "@/lib/utils";
import { updateOfferSchema } from "@/lib/validators";

type Params = {
  params: {
    id: string;
  };
};

function offerLabel(amountCents: number) {
  return formatCurrencyFromCents(amountCents, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });
}

export async function PATCH(request: Request, { params }: Params) {
  const session = await getAuthSession();
  if (!session?.user?.id) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  try {
    await assertUserCanAccessMarketplace(session.user.id);
  } catch (error) {
    return NextResponse.json(
      { message: error instanceof Error ? error.message : "Your account cannot manage offers right now." },
      { status: 403 }
    );
  }

  const payload = await request.json().catch(() => ({}));
  const parsed = updateOfferSchema.safeParse(payload);
  if (!parsed.success) {
    return NextResponse.json({ message: "Invalid offer action.", errors: parsed.error.flatten() }, { status: 400 });
  }

  const offer = await prisma.conversationOffer.findUnique({
    where: {
      id: params.id
    },
    include: {
      listing: true,
      conversation: true
    }
  });

  if (!offer) {
    return NextResponse.json({ message: "Offer not found." }, { status: 404 });
  }

  const isBuyer = offer.buyerId === session.user.id;
  const isSeller = offer.sellerId === session.user.id;
  if (!isBuyer && !isSeller) {
    return NextResponse.json({ message: "Only conversation participants can manage this offer." }, { status: 403 });
  }

  if (offer.status !== OfferStatus.PENDING) {
    return NextResponse.json({ message: "This offer has already been answered." }, { status: 409 });
  }

  const amountLabel = offerLabel(offer.amountCents);

  if (parsed.data.action === "cancel") {
    if (!isBuyer) {
      return NextResponse.json({ message: "Only the buyer can cancel their offer." }, { status: 403 });
    }

    const updated = await prisma.$transaction(async (tx) => {
      const changed = await tx.conversationOffer.update({
        where: {
          id: offer.id
        },
        data: {
          status: OfferStatus.CANCELLED,
          respondedAt: new Date()
        }
      });

      await tx.message.create({
        data: {
          conversationId: offer.conversationId,
          senderId: session.user.id,
          kind: "SYSTEM",
          body: `Offer cancelled: ${amountLabel}`
        }
      });

      return changed;
    });

    await createNotification({
      userId: offer.sellerId,
      type: NotificationType.PURCHASE_UPDATED,
      title: "An offer was cancelled.",
      body: `${offer.listing.title} offer at ${amountLabel} was cancelled.`,
      href: `/messages?conversation=${offer.conversationId}`,
      externalKey: `offer:${offer.id}:cancelled`,
      metadata: {
        offerId: offer.id,
        conversationId: offer.conversationId,
        listingId: offer.listingId
      }
    });

    return NextResponse.json({ id: updated.id, status: updated.status });
  }

  if (!isSeller) {
    return NextResponse.json({ message: "Only the seller can accept or decline an offer." }, { status: 403 });
  }

  if (parsed.data.action === "decline") {
    const updated = await prisma.$transaction(async (tx) => {
      const changed = await tx.conversationOffer.update({
        where: {
          id: offer.id
        },
        data: {
          status: OfferStatus.DECLINED,
          respondedAt: new Date()
        }
      });

      await tx.message.create({
        data: {
          conversationId: offer.conversationId,
          senderId: session.user.id,
          kind: "SYSTEM",
          body: `Offer declined: ${amountLabel}`
        }
      });

      return changed;
    });

    await createNotification({
      userId: offer.buyerId,
      type: NotificationType.PURCHASE_UPDATED,
      title: "Your offer was declined.",
      body: `${offer.listing.title} at ${amountLabel}.`,
      href: `/messages?conversation=${offer.conversationId}`,
      externalKey: `offer:${offer.id}:declined`,
      metadata: {
        offerId: offer.id,
        conversationId: offer.conversationId,
        listingId: offer.listingId
      }
    });

    return NextResponse.json({ id: updated.id, status: updated.status });
  }

  if (offer.listing.status !== ListingStatus.ACTIVE || offer.listing.moderationStatus !== ListingModerationStatus.VISIBLE) {
    return NextResponse.json({ message: "This listing is not available for accepted offers." }, { status: 409 });
  }

  const protection = await getListingMutationProtection(offer.listingId);
  if (protection.blocked) {
    return NextResponse.json({ message: protection.message }, { status: 409 });
  }

  const activeTransaction = await prisma.transaction.findFirst({
    where: {
      listingId: offer.listingId,
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
  const result = await prisma.$transaction(async (tx) => {
    const transaction = await tx.transaction.create({
      data: {
        listingId: offer.listingId,
        sellerId: offer.sellerId,
        buyerId: offer.buyerId,
        conversationId: offer.conversationId,
        status: TransactionStatus.PENDING_CONFIRMATION,
        handoffStatus: HandoffStatus.PENDING_HANDOFF,
        agreedPriceCents: offer.amountCents,
        sellerMarkedSoldAt: now
      }
    });

    const acceptedOffer = await tx.conversationOffer.update({
      where: {
        id: offer.id
      },
      data: {
        status: OfferStatus.ACCEPTED,
        respondedAt: now,
        acceptedTransactionId: transaction.id
      }
    });

    await tx.conversationOffer.updateMany({
      where: {
        listingId: offer.listingId,
        status: OfferStatus.PENDING,
        id: {
          not: offer.id
        }
      },
      data: {
        status: OfferStatus.DECLINED,
        respondedAt: now
      }
    });

    await tx.listing.update({
      where: {
        id: offer.listingId
      },
      data: {
        status: ListingStatus.PENDING_CONFIRMATION,
        soldToUserId: offer.buyerId
      }
    });

    await tx.message.create({
      data: {
        conversationId: offer.conversationId,
        senderId: session.user.id,
        kind: "SYSTEM",
        body: `Offer accepted: ${amountLabel}. Open purchases to coordinate the handoff.`
      }
    });

    return { offer: acceptedOffer, transaction };
  });

  await createNotification({
    userId: offer.buyerId,
    type: NotificationType.PURCHASE_UPDATED,
    title: "Your offer was accepted.",
    body: `${offer.listing.title} is yours for ${amountLabel}. Coordinate pickup from this thread or Purchases.`,
    href: `/messages?conversation=${offer.conversationId}`,
    externalKey: `offer:${offer.id}:accepted`,
    metadata: {
      offerId: offer.id,
      conversationId: offer.conversationId,
      listingId: offer.listingId,
      transactionId: result.transaction.id
    }
  });

  return NextResponse.json({ id: result.offer.id, status: result.offer.status, transactionId: result.transaction.id });
}
