import { NextResponse } from "next/server";

import { getAuthSession } from "@/lib/auth";
import { getMarketListings } from "@/lib/data";
import { prisma } from "@/lib/prisma";
import { listingSchema } from "@/lib/validators";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const session = await getAuthSession();

  const q = searchParams.get("q") ?? undefined;
  const category = searchParams.get("category") ?? undefined;
  const condition = searchParams.get("condition") ?? undefined;
  const location = searchParams.get("location") ?? undefined;
  const sort = searchParams.get("sort") ?? "newest";
  const page = Number(searchParams.get("page") ?? "1");
  const min = Number(searchParams.get("min") ?? "100");
  const max = Number(searchParams.get("max") ?? "250000");

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

  const payload = await request.json();
  const parsed = listingSchema.safeParse(payload);
  if (!parsed.success) {
    return NextResponse.json({ message: "Invalid listing", errors: parsed.error.flatten() }, { status: 400 });
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
