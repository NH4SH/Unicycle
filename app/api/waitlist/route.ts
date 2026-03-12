import { NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";
import { waitlistSchema } from "@/lib/validators";

export async function POST(request: Request) {
  const payload = await request.json();
  const parsed = waitlistSchema.safeParse(payload);

  if (!parsed.success) {
    return NextResponse.json({ message: "Invalid payload", errors: parsed.error.flatten() }, { status: 400 });
  }

  const created = await prisma.waitlistEntry.create({
    data: {
      email: parsed.data.email,
      reason: parsed.data.reason
    }
  });

  return NextResponse.json({ id: created.id }, { status: 201 });
}
