import { NextResponse } from "next/server";

import { ListingStatus } from "@prisma/client";

import { getAuthSession } from "@/lib/auth";
import { assertSellerCanPublishListing, getListingMutationProtection } from "@/lib/listing-guardrails";
import { packListingDescription, unpackListingDescription } from "@/lib/listing-draft";
import { fromPrismaBrowseLane, toPrismaBrowseLane } from "@/lib/market-browse";
import { assertUserCanAccessMarketplace } from "@/lib/moderation";
import { prisma } from "@/lib/prisma";
import { getSellerPayoutState } from "@/lib/seller-payouts";
import { listingSubmissionSchema, listingUpdateSchema } from "@/lib/validators";

type Params = { params: { id: string } };

export async function PATCH(request: Request, { params }: Params) {
  const session = await getAuthSession();
  if (!session?.user) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });

  const listing = await prisma.listing.findUnique({ where: { id: params.id } });
  if (!listing) return NextResponse.json({ message: "Listing not found" }, { status: 404 });
  if (listing.sellerId !== session.user.id) {
    return NextResponse.json({ message: "Forbidden" }, { status: 403 });
  }

  try {
    await assertUserCanAccessMarketplace(session.user.id);
  } catch (error) {
    return NextResponse.json(
      { message: error instanceof Error ? error.message : "Your account cannot edit listings right now." },
      { status: 403 }
    );
  }

  if (listing.status === ListingStatus.PENDING_CONFIRMATION || listing.status === ListingStatus.COMPLETED) {
    return NextResponse.json(
      { message: "This listing is locked because it is already in a live sale flow or fully completed." },
      { status: 409 }
    );
  }

  const protection = await getListingMutationProtection(listing.id);
  if (protection.blocked) {
    return NextResponse.json({ message: protection.message }, { status: 409 });
  }

  const payload = await request.json();
  const parsed = listingUpdateSchema.safeParse(payload);

  if (!parsed.success) {
    return NextResponse.json({ message: "Invalid payload", errors: parsed.error.flatten() }, { status: 400 });
  }

  const safeData = parsed.data;
  const nextStatus = safeData.status ?? listing.status;
  const currentDetails = unpackListingDescription(listing.description);
  const mergedListing = listingSubmissionSchema.safeParse({
    title: safeData.title ?? listing.title,
    description: safeData.description ?? currentDetails.description,
    priceCents: safeData.priceCents ?? listing.priceCents,
    category: safeData.category ?? listing.category,
    browseLane: safeData.browseLane ?? fromPrismaBrowseLane(listing.shoppingLane),
    condition: safeData.condition ?? listing.condition,
    images: safeData.images ?? (Array.isArray(listing.images) ? listing.images : []),
    pickupLocations: safeData.pickupLocations ?? (Array.isArray(listing.pickupLocations) ? listing.pickupLocations : []),
    meetupNotes: safeData.meetupNotes ?? listing.meetupNotes ?? undefined,
    brand: safeData.brand ?? currentDetails.brand,
    size: safeData.size ?? currentDetails.size,
    color: safeData.color ?? currentDetails.color
  });

  if (!mergedListing.success) {
    return NextResponse.json(
      { message: "Invalid payload", errors: mergedListing.error.flatten() },
      { status: 400 }
    );
  }

  if (nextStatus === ListingStatus.ACTIVE) {
    try {
      await assertSellerCanPublishListing({
        userId: session.user.id,
        priceCents: mergedListing.data.priceCents,
        listingIdToExclude: listing.id
      });
    } catch (error) {
      return NextResponse.json(
        {
          message: error instanceof Error ? error.message : "Your account cannot publish this listing yet."
        },
        { status: 403 }
      );
    }

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
      title: mergedListing.data.title,
      description: packListingDescription(mergedListing.data),
      priceCents: mergedListing.data.priceCents,
      category: mergedListing.data.category,
      shoppingLane: toPrismaBrowseLane(mergedListing.data.browseLane),
      condition: mergedListing.data.condition,
      images: mergedListing.data.images,
      pickupLocations: mergedListing.data.pickupLocations,
      meetupNotes: mergedListing.data.meetupNotes,
      status: nextStatus
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

  const protection = await getListingMutationProtection(listing.id);
  if (protection.blocked) {
    return NextResponse.json({ message: protection.message }, { status: 409 });
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
