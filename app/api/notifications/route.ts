import { NextResponse } from "next/server";

import { getAuthSession } from "@/lib/auth";
import { listNotificationsForUser, markAllNotificationsRead } from "@/lib/notifications";

export async function GET(request: Request) {
  const session = await getAuthSession();
  if (!session?.user?.id) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const rawLimit = Number(searchParams.get("limit") ?? "12");
  const limit = Number.isFinite(rawLimit) ? rawLimit : 12;

  const notifications = await listNotificationsForUser(session.user.id, limit);
  return NextResponse.json(notifications);
}

export async function PATCH() {
  const session = await getAuthSession();
  if (!session?.user?.id) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  await markAllNotificationsRead(session.user.id);
  const notifications = await listNotificationsForUser(session.user.id, 12);
  return NextResponse.json({ ok: true, unreadCount: notifications.unreadCount });
}
