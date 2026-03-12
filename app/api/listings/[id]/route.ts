import { NextResponse } from "next/server";

import { getAuthSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { listingSchema } from "@/lib/validators";
import { ListingStatus } from "@prisma/client";

type Params = { params: { id: string } };

export async function PATCH(request: Request, { params }: Params) {
  const session = await getAuthSession();
  if (!session?.user) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });

  const listing = await prisma.listing.findUnique({ where: { id: params.id } });
  if (!listing) return NextResponse.json({ message: "Listing not found" }, { status: 404 });
  if (listing.sellerId !== session.user.id) {
    return NextResponse.json({ message: "Forbidden" }, { status: 403 });
  }

  const payload = await request.json();
  const parsed = listingSchema.partial().safeParse(payload);
  const status = payload.status as ListingStatus | undefined;
  const validStatus = status && Object.values(ListingStatus).includes(status) ? status : undefined;

  if (!parsed.success && !validStatus) {
    return NextResponse.json({ message: "Invalid payload", errors: parsed.error.flatten() }, { status: 400 });
  }

  const safeData = parsed.success ? parsed.data : {};

  const updated = await prisma.listing.update({
    where: { id: params.id },
    data: {
      ...safeData,
      status: validStatus,
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

  await prisma.listing.delete({ where: { id: params.id } });
  return NextResponse.json({ ok: true });
}
