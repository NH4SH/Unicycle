import { NextResponse } from "next/server";

import { getAuthSession } from "@/lib/auth";
import { listNotificationsForUser, markNotificationRead } from "@/lib/notifications";

type NotificationRouteProps = {
  params: {
    id: string;
  };
};

export async function PATCH(_request: Request, { params }: NotificationRouteProps) {
  const session = await getAuthSession();
  if (!session?.user?.id) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  await markNotificationRead(session.user.id, params.id);
  const notifications = await listNotificationsForUser(session.user.id, 12);
  return NextResponse.json({ ok: true, unreadCount: notifications.unreadCount });
}
