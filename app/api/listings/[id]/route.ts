import { NextResponse } from "next/server";

import { ListingStatus } from "@prisma/client";

import { getAuthSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getSellerPayoutState } from "@/lib/seller-payouts";
import { listingUpdateSchema } from "@/lib/validators";

type Params = { params: { id: string } };

export async function PATCH(request: Request, { params }: Params) {
  const session = await getAuthSession();
  if (!session?.user) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });

  const listing = await prisma.listing.findUnique({ where: { id: params.id } });
  if (!listing) return NextResponse.json({ message: "Listing not found" }, { status: 404 });
  if (listing.sellerId !== session.user.id) {
    return NextResponse.json({ message: "Forbidden" }, { status: 403 });
  }

  if (listing.status === ListingStatus.PENDING_CONFIRMATION || listing.status === ListingStatus.COMPLETED) {
    return NextResponse.json(
      { message: "This listing is locked because it is already in a live sale flow or fully completed." },
      { status: 409 }
    );
  }

  const payload = await request.json();
  const parsed = listingUpdateSchema.safeParse(payload);

  if (!parsed.success) {
    return NextResponse.json({ message: "Invalid payload", errors: parsed.error.flatten() }, { status: 400 });
  }

  const safeData = parsed.data;
  const nextStatus = safeData.status ?? listing.status;

  if (nextStatus === ListingStatus.ACTIVE) {
    const payoutState = await getSellerPayoutState(session.user.id);

    if (!payoutState.readyToReceivePayments) {
      return NextResponse.json(
        {
          message:
            payoutState.status === "requires_reconnect"
              ? "Reconnect payouts before putting this listing live on HoosFinds."
              : "Finish payout setup before putting this listing live on HoosFinds."
        },
        { status: 409 }
      );
    }
  }

  const updated = await prisma.listing.update({
    where: { id: params.id },
    data: {
      ...safeData,
      images: safeData.images,
      pickupLocations: safeData.pickupLocations
    }
  });

  return NextResponse.json({ id: updated.id });
}

export async function DELETE(_: Request, { params }: Params) {
  const session = await getAuthSession();
  if (!session?.user) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });

  const listing = await prisma.listing.findUnique({ where: { id: params.id } });
  if (!listing) return NextResponse.json({ message: "Listing not found" }, { status: 404 });
  if (listing.sellerId !== session.user.id) {
    return NextResponse.json({ message: "Forbidden" }, { status: 403 });
  }
  if (listing.status === ListingStatus.PENDING_CONFIRMATION || listing.status === ListingStatus.COMPLETED) {
    return NextResponse.json(
      { message: "Listings tied to an active or completed handoff can’t be deleted." },
      { status: 409 }
    );
  }

  await prisma.listing.delete({ where: { id: params.id } });
  return NextResponse.json({ ok: true });
}
