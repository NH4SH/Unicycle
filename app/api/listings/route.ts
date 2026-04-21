import { NextResponse } from "next/server";

import { getAuthSession } from "@/lib/auth";
import { getMarketListings } from "@/lib/data";
import { MARKET_PRICE_MIN_CENTS, MARKET_PRICE_OPEN_MAX_CENTS } from "@/lib/constants";
import { assertSellerCanPublishListing } from "@/lib/listing-guardrails";
import { packListingDescription } from "@/lib/listing-draft";
import { assertUserCanAccessMarketplace } from "@/lib/moderation";
import { normalizeMarketAudience, normalizeMarketBrowseLane, toPrismaBrowseLane } from "@/lib/market-browse";
import { prisma } from "@/lib/prisma";
import { getSellerPayoutState } from "@/lib/seller-payouts";
import { canUserSell } from "@/lib/user-access";
import { listingSubmissionSchema } from "@/lib/validators";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const session = await getAuthSession();

  const q = searchParams.get("q") ?? undefined;
  const requestedLane = normalizeMarketBrowseLane(searchParams.get("lane"));
  const audience = normalizeMarketAudience(searchParams.get("audience")) ?? (requestedLane === "womens" || requestedLane === "mens" ? requestedLane : undefined);
  const lane = requestedLane === "womens" || requestedLane === "mens" ? "all" : requestedLane ?? undefined;
  const category = searchParams.get("category") ?? undefined;
  const condition = searchParams.get("condition") ?? undefined;
  const location = searchParams.get("location") ?? undefined;
  const brand = searchParams.get("brand") ?? undefined;
  const size = searchParams.get("size") ?? undefined;
  const color = searchParams.get("color") ?? undefined;
  const sort = searchParams.get("sort") ?? "newest";
  const page = Math.max(1, Number(searchParams.get("page") ?? "1") || 1);
  const minParam = searchParams.get("min");
  const maxParam = searchParams.get("max");
  const min = minParam ? Math.max(MARKET_PRICE_MIN_CENTS, Number(minParam) || MARKET_PRICE_MIN_CENTS) : undefined;
  const normalizedMin = min ?? MARKET_PRICE_MIN_CENTS;
  const max = maxParam
    ? Math.max(normalizedMin, Math.min(MARKET_PRICE_OPEN_MAX_CENTS, Number(maxParam) || MARKET_PRICE_OPEN_MAX_CENTS))
    : undefined;

  const result = await getMarketListings({
    q,
    audience,
    lane,
    category,
    condition,
    location,
    brand,
    size,
    color,
    sort,
    page,
    min,
    max,
    userId: session?.user?.id
  });

  return NextResponse.json(result);
}

export async function POST(request: Request) {
  const session = await getAuthSession();
  if (!session?.user) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  if (
    !canUserSell({
      email: session.user.email ?? "",
      role: session.user.role,
      sellerKind: session.user.sellerKind,
      verifiedShopApprovedAt: session.user.verifiedShopApprovedAt ?? null
    })
  ) {
    return NextResponse.json({ message: "Only UVA students and approved Verified Shops can publish listings." }, { status: 403 });
  }

  try {
    await assertUserCanAccessMarketplace(session.user.id);
  } catch (error) {
    return NextResponse.json(
      { message: error instanceof Error ? error.message : "Your account cannot publish listings right now." },
      { status: 403 }
    );
  }

  const payload = await request.json();
  const parsed = listingSubmissionSchema.safeParse(payload);
  if (!parsed.success) {
    return NextResponse.json({ message: "Invalid listing", errors: parsed.error.flatten() }, { status: 400 });
  }

  try {
    await assertSellerCanPublishListing({
      userId: session.user.id,
      priceCents: parsed.data.priceCents
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
            ? "Before your listing can go live, reconnect payouts so HoosFinds knows where to send your earnings."
            : "Before your listing can go live, connect payouts so HoosFinds knows where to send your earnings."
      },
      { status: 409 }
    );
  }

  const listing = await prisma.listing.create({
    data: {
      title: parsed.data.title,
      description: packListingDescription(parsed.data),
      priceCents: parsed.data.priceCents,
      category: parsed.data.category,
      shoppingLane: toPrismaBrowseLane(parsed.data.browseLane),
      condition: parsed.data.condition,
      sellerId: session.user.id,
      images: parsed.data.images,
      pickupLocations: parsed.data.pickupLocations,
      meetupNotes: parsed.data.meetupNotes
    }
  });

  return NextResponse.json({ id: listing.id }, { status: 201 });
}
