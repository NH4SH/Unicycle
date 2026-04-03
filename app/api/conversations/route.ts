import { NextResponse } from "next/server";

import { getAuthSession } from "@/lib/auth";
import { getConversationsForUser, markConversationAsRead } from "@/lib/data";
import { assertUsersCanMessageEachOther } from "@/lib/message-safety";
import { assertUserCanAccessMarketplace } from "@/lib/moderation";
import { prisma } from "@/lib/prisma";

export async function GET(request: Request) {
  const session = await getAuthSession();
  if (!session?.user) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });

  const data = await getConversationsForUser(session.user.id);

  const conversationId = new URL(request.url).searchParams.get("conversationId");
  if (conversationId) {
    await markConversationAsRead(conversationId, session.user.id);
  }

  return NextResponse.json(data);
}

export async function POST(request: Request) {
  const session = await getAuthSession();
  if (!session?.user) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  if (!session.user.canBuy) {
    return NextResponse.json({ message: "Buying on HoosFinds stays exclusive to UVA students." }, { status: 403 });
  }

  try {
    await assertUserCanAccessMarketplace(session.user.id);
  } catch (error) {
    return NextResponse.json(
      { message: error instanceof Error ? error.message : "Your account cannot start new conversations right now." },
      { status: 403 }
    );
  }

  const payload = await request.json();
  const listingId = payload.listingId as string | undefined;

  if (!listingId) {
    return NextResponse.json({ message: "listingId is required" }, { status: 400 });
  }

  const listing = await prisma.listing.findUnique({ where: { id: listingId } });
  if (!listing) return NextResponse.json({ message: "Listing not found" }, { status: 404 });

  if (listing.status !== "ACTIVE" || listing.moderationStatus !== "VISIBLE") {
    return NextResponse.json({ message: "This listing is no longer available for new conversations." }, { status: 409 });
  }

  if (listing.sellerId === session.user.id) {
    return NextResponse.json({ message: "Cannot message yourself" }, { status: 400 });
  }

  try {
    await assertUsersCanMessageEachOther(session.user.id, listing.sellerId);
  } catch (error) {
    return NextResponse.json(
      { message: error instanceof Error ? error.message : "Messaging is unavailable for this listing." },
      { status: 403 }
    );
  }

  const conversation = await prisma.conversation.upsert({
    where: {
      buyerId_sellerId_listingId: {
        buyerId: session.user.id,
        sellerId: listing.sellerId,
        listingId
      }
    },
    create: {
      buyerId: session.user.id,
      sellerId: listing.sellerId,
      listingId
    },
    update: {}
  });

  return NextResponse.json({ id: conversation.id });
}
