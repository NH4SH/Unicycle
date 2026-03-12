import { redirect } from "next/navigation";

import { MessagesClient } from "@/components/messages/messages-client";
import { getAuthSession } from "@/lib/auth";

export default async function MessagesPage() {
  const session = await getAuthSession();

  if (!session?.user.id) {
    redirect("/sign-in");
  }

  return (
    <div className="container space-y-4 py-8">
      <div>
        <h1 className="font-display text-4xl font-black tracking-tight">Messages</h1>
        <p className="text-sm text-muted-foreground">Coordinate pickups and negotiate fast.</p>
      </div>
      <MessagesClient userId={session.user.id} />
    </div>
  );
}
