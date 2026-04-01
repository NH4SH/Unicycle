import { NextResponse } from "next/server";

import { getAuthSession } from "@/lib/auth";
import { getMarketListings } from "@/lib/data";
import { MARKET_PRICE_MIN_CENTS, MARKET_PRICE_OPEN_MAX_CENTS } from "@/lib/constants";
import { prisma } from "@/lib/prisma";
import { getSellerPayoutState } from "@/lib/seller-payouts";
import { canUserSell } from "@/lib/user-access";
import { listingSchema } from "@/lib/validators";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const session = await getAuthSession();

  const q = searchParams.get("q") ?? undefined;
  const category = searchParams.get("category") ?? undefined;
  const condition = searchParams.get("condition") ?? undefined;
  const location = searchParams.get("location") ?? undefined;
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
    category,
    condition,
    location,
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

  const payload = await request.json();
  const parsed = listingSchema.safeParse(payload);
  if (!parsed.success) {
    return NextResponse.json({ message: "Invalid listing", errors: parsed.error.flatten() }, { status: 400 });
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
      ...parsed.data,
      sellerId: session.user.id,
      images: parsed.data.images,
      pickupLocations: parsed.data.pickupLocations
    }
  });

  return NextResponse.json({ id: listing.id }, { status: 201 });
}
