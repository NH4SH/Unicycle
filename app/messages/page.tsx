import { redirect } from "next/navigation";

import { MessagesClient } from "@/components/messages/messages-client";
import { getAuthSession } from "@/lib/auth";

export default async function MessagesPage() {
  const session = await getAuthSession();

  if (!session?.user.id) {
    redirect("/sign-in");
  }

  return (
    <div className="container space-y-6 py-8 md:space-y-8 md:py-10">
      <div className="grid gap-4 border-b border-border/80 pb-6 md:grid-cols-[1fr_auto] md:items-end">
        <div className="space-y-2">
          <p className="editorial-eyebrow">Messages</p>
          <h1 className="font-display text-4xl font-extrabold tracking-tight md:text-5xl">Keep the handoff easy.</h1>
          <p className="max-w-2xl text-sm leading-7 text-muted-foreground md:text-base">
            HoosFinds messages are where buyers and sellers ask fit or condition questions, settle pickup timing, and keep the exchange local.
          </p>
        </div>
        <div className="surface-pill px-4 py-2 text-xs uppercase tracking-[0.18em]">
          UVA-only conversations
        </div>
      </div>
      <MessagesClient userId={session.user.id} />
    </div>
  );
}
