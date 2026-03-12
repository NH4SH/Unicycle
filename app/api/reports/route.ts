import { NextResponse } from "next/server";

import { getAuthSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST(request: Request) {
  const session = await getAuthSession();
  if (!session?.user) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });

  const payload = await request.json();
  const listingId = payload.listingId as string | undefined;
  const reason = payload.reason as string | undefined;

  if (!listingId || !reason || reason.length < 4) {
    return NextResponse.json({ message: "Invalid report" }, { status: 400 });
  }

  const report = await prisma.report.create({
    data: {
      listingId,
      reporterId: session.user.id,
      reason
    }
  });

  return NextResponse.json({ id: report.id }, { status: 201 });
}
