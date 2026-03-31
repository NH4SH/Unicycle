import { redirect } from "next/navigation";

import { PurchasesView } from "@/components/transactions/purchases-view";
import { getAuthSession } from "@/lib/auth";
import { getPurchasesOverview } from "@/lib/data";

export default async function PurchasesPage() {
  const session = await getAuthSession();

  if (!session?.user.id) {
    redirect("/sign-in");
  }

  const { purchases, sales } = await getPurchasesOverview(session.user.id);
  const pendingPurchases = purchases.filter((item) => item.status === "PENDING_CONFIRMATION").length;
  const pendingSales = sales.filter((item) => item.status === "PENDING_CONFIRMATION").length;

  return (
    <div className="container space-y-6 py-8 md:space-y-8 md:py-10">
      <div className="grid gap-4 border-b border-border/80 pb-6 md:grid-cols-[1fr_auto] md:items-end">
        <div className="space-y-2">
          <p className="editorial-eyebrow">Purchases & sales</p>
          <h1 className="font-display text-4xl font-extrabold tracking-tight md:text-5xl">Track every handoff.</h1>
          <p className="max-w-2xl text-sm leading-7 text-muted-foreground md:text-base">
            See what still needs confirmation, keep campus pickups accountable, and leave a buyer-verified rating only after the item actually lands in hand.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <div className="surface-pill px-4 py-2 text-xs uppercase tracking-[0.18em]">{pendingPurchases} awaiting your confirmation</div>
          <div className="surface-pill px-4 py-2 text-xs uppercase tracking-[0.18em]">{pendingSales} awaiting buyer reply</div>
        </div>
      </div>

      <PurchasesView purchases={purchases} sales={sales} />
    </div>
  );
}
